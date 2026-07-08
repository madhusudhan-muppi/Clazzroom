import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft, CheckCircle, Clock, XCircle, Upload, FileText,
  ChevronDown, ChevronUp, AlertCircle, Send
} from 'lucide-react';
import TimelineBadge from '../components/TimelineBadge';
import { PROJECT_STAGES, STAGE_STATUS, calculateStageDeadlines } from '../lib/stages';

export default function ProjectTimelinePage() {
  const { classId, projectId } = useParams();
  const { userData, currentUser } = useAuth();

  const [classroom, setClassroom] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedStage, setExpandedStage] = useState(null);

  // Student upload states
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Mentor review states
  const [feedback, setFeedback] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    // Fetch classroom
    getDoc(doc(db, 'classrooms', classId)).then((snap) => {
      if (snap.exists()) setClassroom({ id: snap.id, ...snap.data() });
    });

    // Real-time listener on the project document
    const unsubscribe = onSnapshot(
      doc(db, `classrooms/${classId}/projects/${projectId}`),
      (snap) => {
        if (snap.exists()) {
          setProject({ id: snap.id, ...snap.data() });
        }
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [classId, projectId]);

  // Auto-expand the current active stage
  useEffect(() => {
    if (project && expandedStage === null) {
      const idx = project.stages.findIndex(s => s.status !== STAGE_STATUS.APPROVED);
      setExpandedStage(idx === -1 ? 7 : idx);
    }
  }, [project]);

  const isOwner = currentUser?.uid === project?.student_id;
  const isMentor = userData?.role === 'mentor';

  const deadlines = classroom?.project_start_date && classroom?.project_end_date
    ? calculateStageDeadlines(classroom.project_start_date, classroom.project_end_date, classroom.custom_durations)
    : null;

  // ------------- Student Actions -------------

  async function handleFileUpload(stageIndex) {
    if (!file) return;
    setUploading(true);

    try {
      const storageRef = ref(storage, `projects/${classId}/${projectId}/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          },
          reject,
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);

            // Update the stage in the project doc
            const updatedStages = [...project.stages];
            updatedStages[stageIndex] = {
              ...updatedStages[stageIndex],
              file_url: url,
              file_name: file.name,
            };

            await updateDoc(doc(db, `classrooms/${classId}/projects/${projectId}`), {
              stages: updatedStages,
            });

            resolve();
          }
        );
      });

      setFile(null);
      setUploadProgress(0);
    } catch (err) {
      console.error(err);
      alert('Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleMarkComplete(stageIndex) {
    try {
      const updatedStages = [...project.stages];
      updatedStages[stageIndex] = {
        ...updatedStages[stageIndex],
        status: STAGE_STATUS.SUBMITTED,
        submitted_at: new Date().toISOString(),
      };

      await updateDoc(doc(db, `classrooms/${classId}/projects/${projectId}`), {
        stages: updatedStages,
      });
    } catch (err) {
      console.error(err);
      alert('Failed to submit stage.');
    }
  }

  // ------------- Mentor Actions -------------

  async function handleApprove(stageIndex) {
    setReviewing(true);
    try {
      const updatedStages = [...project.stages];
      updatedStages[stageIndex] = {
        ...updatedStages[stageIndex],
        status: STAGE_STATUS.APPROVED,
        reviewed_at: new Date().toISOString(),
        feedback: feedback || null,
      };

      // Advance next stage to in_progress (if exists)
      if (stageIndex + 1 < 8) {
        updatedStages[stageIndex + 1] = {
          ...updatedStages[stageIndex + 1],
          status: STAGE_STATUS.IN_PROGRESS,
        };
      }

      await updateDoc(doc(db, `classrooms/${classId}/projects/${projectId}`), {
        stages: updatedStages,
      });

      setFeedback('');
      // Auto-expand next stage
      if (stageIndex + 1 < 8) setExpandedStage(stageIndex + 1);
    } catch (err) {
      console.error(err);
      alert('Failed to approve stage.');
    } finally {
      setReviewing(false);
    }
  }

  async function handleReject(stageIndex) {
    if (!feedback.trim()) {
      alert('Please provide feedback when rejecting.');
      return;
    }
    setReviewing(true);
    try {
      const updatedStages = [...project.stages];
      updatedStages[stageIndex] = {
        ...updatedStages[stageIndex],
        status: STAGE_STATUS.REJECTED,
        reviewed_at: new Date().toISOString(),
        feedback: feedback.trim(),
      };

      await updateDoc(doc(db, `classrooms/${classId}/projects/${projectId}`), {
        stages: updatedStages,
      });

      setFeedback('');
    } catch (err) {
      console.error(err);
      alert('Failed to reject stage.');
    } finally {
      setReviewing(false);
    }
  }

  // ------------- Render Helpers -------------

  function getStageIcon(status) {
    switch (status) {
      case STAGE_STATUS.APPROVED:
        return <CheckCircle size={20} className="text-emerald-500" />;
      case STAGE_STATUS.SUBMITTED:
        return <Clock size={20} className="text-amber-500" />;
      case STAGE_STATUS.REJECTED:
        return <XCircle size={20} className="text-red-500" />;
      case STAGE_STATUS.IN_PROGRESS:
        return <AlertCircle size={20} className="text-blue-500" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  }

  function getStatusLabel(status) {
    switch (status) {
      case STAGE_STATUS.APPROVED: return { text: 'Approved', cls: 'bg-emerald-100 text-emerald-800' };
      case STAGE_STATUS.SUBMITTED: return { text: 'Awaiting Review', cls: 'bg-amber-100 text-amber-800' };
      case STAGE_STATUS.REJECTED: return { text: 'Needs Revision', cls: 'bg-red-100 text-red-800' };
      case STAGE_STATUS.IN_PROGRESS: return { text: 'In Progress', cls: 'bg-blue-100 text-blue-800' };
      default: return { text: 'Pending', cls: 'bg-gray-100 text-gray-600' };
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  if (!project) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Project not found</div>;
  }

  const approvedCount = project.stages.filter(s => s.status === STAGE_STATUS.APPROVED).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            to={isMentor ? `/c/${classId}/students` : `/c/${classId}`}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft size={16} /> {isMentor ? 'Back to Students' : 'Back to Classroom'}
          </Link>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.topic}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {project.student_name} • {approvedCount}/8 stages complete
              </p>
            </div>
            {classroom?.project_start_date && classroom?.project_end_date && (
              <TimelineBadge
                stages={project.stages}
                startDate={classroom.project_start_date}
                endDate={classroom.project_end_date}
                customDurations={classroom.custom_durations}
                size="md"
              />
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${(approvedCount / 8) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{Math.round((approvedCount / 8) * 100)}% complete</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gray-200"></div>

          <div className="space-y-4">
            {project.stages.map((stage, idx) => {
              const stageInfo = PROJECT_STAGES[idx];
              const statusLabel = getStatusLabel(stage.status);
              const isExpanded = expandedStage === idx;
              const deadline = deadlines ? deadlines[idx] : null;
              const isActive = stage.status !== STAGE_STATUS.PENDING && stage.status !== STAGE_STATUS.APPROVED;
              const isActionable = stage.status === STAGE_STATUS.IN_PROGRESS || stage.status === STAGE_STATUS.SUBMITTED || stage.status === STAGE_STATUS.REJECTED;

              return (
                <div key={stageInfo.key} className="relative pl-12">
                  {/* Timeline dot */}
                  <div className="absolute left-[9px] top-5 z-10 bg-white p-0.5">
                    {getStageIcon(stage.status)}
                  </div>

                  <div className={`bg-white rounded-xl shadow-sm border transition-all ${
                    isActive ? 'border-gray-300' : 'border-gray-100'
                  }`}>
                    {/* Stage Header */}
                    <button
                      onClick={() => setExpandedStage(isExpanded ? null : idx)}
                      className="w-full text-left px-5 py-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-gray-400">Stage {idx + 1}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusLabel.cls}`}>
                              {statusLabel.text}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 mt-0.5">{stageInfo.name}</h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        {deadline && (
                          <span className="text-xs text-gray-500 hidden sm:block">
                            Due: {deadline.toLocaleDateString()}
                          </span>
                        )}
                        {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-5 py-5 space-y-4">
                        <p className="text-sm text-gray-600">{stageInfo.description}</p>

                        {deadline && (
                          <p className="text-xs text-gray-500">
                            Expected completion: <span className="font-medium">{deadline.toLocaleDateString()}</span>
                            {stage.submitted_at && <> • Submitted: <span className="font-medium">{new Date(stage.submitted_at).toLocaleDateString()}</span></>}
                            {stage.reviewed_at && <> • Reviewed: <span className="font-medium">{new Date(stage.reviewed_at).toLocaleDateString()}</span></>}
                          </p>
                        )}

                        {/* Shared PDF section */}
                        {stage.file_url && (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <FileText size={18} className="text-primary shrink-0" />
                            <span className="text-sm font-medium text-gray-900 truncate flex-1">{stage.file_name}</span>
                            <a
                              href={stage.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline text-sm font-medium whitespace-nowrap"
                            >
                              View PDF
                            </a>
                          </div>
                        )}

                        {/* Feedback from mentor */}
                        {stage.feedback && (
                          <div className={`p-4 rounded-lg border text-sm ${
                            stage.status === STAGE_STATUS.REJECTED
                              ? 'bg-red-50 border-red-100 text-red-900'
                              : 'bg-blue-50 border-blue-100 text-blue-900'
                          }`}>
                            <p className="font-semibold mb-1">
                              {stage.status === STAGE_STATUS.REJECTED ? 'Corrections Required:' : 'Mentor Feedback:'}
                            </p>
                            <p className="whitespace-pre-wrap">{stage.feedback}</p>
                          </div>
                        )}

                        {/* Student Actions */}
                        {isOwner && isActionable && (
                          <div className="space-y-3 pt-2">
                            {(stage.status === STAGE_STATUS.IN_PROGRESS || stage.status === STAGE_STATUS.REJECTED) && (
                              <>
                                {/* File upload */}
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                                  <input
                                    type="file"
                                    id={`file-${idx}`}
                                    className="hidden"
                                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png"
                                    onChange={(e) => setFile(e.target.files[0])}
                                  />
                                  <label htmlFor={`file-${idx}`} className="cursor-pointer flex flex-col items-center">
                                    <Upload size={24} className="text-gray-400 mb-2" />
                                    <span className="text-sm font-medium text-gray-700">
                                      {file ? file.name : 'Upload or replace file'}
                                    </span>
                                    <span className="text-xs text-gray-500 mt-0.5">PDF, Word, PowerPoint, Images</span>
                                  </label>
                                </div>

                                {file && (
                                  <button
                                    onClick={() => handleFileUpload(idx)}
                                    disabled={uploading}
                                    className="w-full py-2 px-4 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 transition-colors"
                                  >
                                    {uploading ? `Uploading... ${Math.round(uploadProgress)}%` : 'Upload File'}
                                  </button>
                                )}

                                {uploadProgress > 0 && uploadProgress < 100 && (
                                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                                  </div>
                                )}

                                {/* Mark complete button */}
                                <button
                                  onClick={() => handleMarkComplete(idx)}
                                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                                >
                                  <Send size={16} />
                                  {stage.status === STAGE_STATUS.REJECTED ? 'Resubmit for Review' : 'Mark Complete & Notify Mentor'}
                                </button>
                              </>
                            )}

                            {stage.status === STAGE_STATUS.SUBMITTED && (
                              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-3 rounded-lg border border-amber-100">
                                <Clock size={18} />
                                <span className="text-sm font-medium">Waiting for mentor review...</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Mentor Actions */}
                        {isMentor && stage.status === STAGE_STATUS.SUBMITTED && (
                          <div className="space-y-3 pt-2 border-t border-gray-100">
                            <h4 className="text-sm font-semibold text-gray-900">Review this stage</h4>

                            <textarea
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                              rows="3"
                              placeholder="Feedback or corrections (required for rejection)..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />

                            <div className="flex gap-3">
                              <button
                                onClick={() => handleApprove(idx)}
                                disabled={reviewing}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 transition-colors"
                              >
                                <CheckCircle size={16} />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(idx)}
                                disabled={reviewing}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors"
                              >
                                <XCircle size={16} />
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
