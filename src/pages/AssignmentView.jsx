import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, UploadCloud, CheckCircle, Clock } from 'lucide-react';

export default function AssignmentView() {
  const { classId, assignmentId } = useParams();
  const { userData, currentUser } = useAuth();
  
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [mySubmission, setMySubmission] = useState(null);
  
  const [loading, setLoading] = useState(true);
  
  // Student Upload States
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [studentText, setStudentText] = useState('');

  // Mentor Grading States
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch assignment
        const assignmentRef = doc(db, `classrooms/${classId}/assignments/${assignmentId}`);
        const assignmentSnap = await getDoc(assignmentRef);
        if (assignmentSnap.exists()) {
          setAssignment({ id: assignmentSnap.id, ...assignmentSnap.data() });
        }

        if (userData?.role === 'student') {
          // Fetch student's own submission
          const mySubRef = doc(db, `classrooms/${classId}/assignments/${assignmentId}/submissions/${currentUser.uid}`);
          const mySubSnap = await getDoc(mySubRef);
          if (mySubSnap.exists()) {
            setMySubmission({ id: mySubSnap.id, ...mySubSnap.data() });
          }
        } else if (userData?.role === 'mentor') {
          // Fetch all submissions for mentor
          const subsRef = collection(db, `classrooms/${classId}/assignments/${assignmentId}/submissions`);
          const subsSnap = await getDocs(subsRef);
          
          // Also fetch profiles to display names
          const subsData = await Promise.all(subsSnap.docs.map(async (subDoc) => {
            const data = subDoc.data();
            const userSnap = await getDoc(doc(db, `users/${subDoc.id}`));
            const userName = userSnap.exists() ? userSnap.data().full_name : 'Unknown Student';
            return { id: subDoc.id, ...data, studentName: userName };
          }));
          
          setSubmissions(subsData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [classId, assignmentId, userData, currentUser]);

  async function handleStudentSubmit(e) {
    e.preventDefault();
    
    if (assignment.type === 'file' && !file) return;
    if (assignment.type !== 'file' && !studentText) return;

    setUploading(true);

    try {
      let fileUrl = null;
      let fileName = null;

      if (assignment.type === 'file' && file) {
        fileName = file.name;
        const storageRef = ref(storage, `submissions/${classId}/${assignmentId}/${currentUser.uid}/${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        // Wait for upload
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            }, 
            (error) => reject(error), 
            async () => {
              fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      // Check if late
      const now = new Date();
      const due = new Date(assignment.due_date);
      const isLate = now > due;

      const submissionData = {
        student_id: currentUser.uid,
        status: isLate ? 'late' : 'submitted',
        submitted_at: now.toISOString(),
      };

      if (assignment.type === 'file') {
        submissionData.file_url = fileUrl;
        submissionData.file_name = fileName;
      } else {
        submissionData.content = studentText;
      }

      const mySubRef = doc(db, `classrooms/${classId}/assignments/${assignmentId}/submissions/${currentUser.uid}`);
      await setDoc(mySubRef, submissionData, { merge: true });
      
      setMySubmission({ id: currentUser.uid, ...submissionData });
    } catch (err) {
      console.error('Error submitting assignment:', err);
      alert(`Failed to submit assignment. Error: ${err.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setFile(null);
      setStudentText('');
    }
  }

  async function handleGradeSubmit(e) {
    e.preventDefault();
    if (!gradingSubmission) return;

    try {
      const subRef = doc(db, `classrooms/${classId}/assignments/${assignmentId}/submissions/${gradingSubmission.id}`);
      await updateDoc(subRef, {
        status: 'graded',
        score: Number(score),
        feedback,
        graded_at: new Date().toISOString()
      });
      
      // Update local state
      setSubmissions(prev => prev.map(sub => 
        sub.id === gradingSubmission.id 
          ? { ...sub, status: 'graded', score: Number(score), feedback } 
          : sub
      ));
      
      setGradingSubmission(null);
      setScore('');
      setFeedback('');
    } catch (err) {
      console.error(err);
      alert("Failed to grade submission.");
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  if (!assignment) {
    return <div className="p-8 text-center">Assignment not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link to={`/c/${classId}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to Classroom
          </Link>
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{assignment.title}</h1>
              <p className="mt-2 text-gray-600 whitespace-pre-wrap">{assignment.description}</p>
              
              {assignment.mentor_file_url && (
                <div className="mt-4 inline-flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-900">
                  <span className="font-semibold">Attachment:</span>
                  <a href={assignment.mentor_file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">
                    {assignment.mentor_file_name || 'View File'}
                  </a>
                </div>
              )}
            </div>
            <div className="bg-gray-100 px-4 py-2 rounded-lg shrink-0">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</div>
              <div className="text-gray-900 font-medium mt-1">
                {new Date(assignment.due_date).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {userData?.role === 'student' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Your Work</h2>
            
            {mySubmission ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-lg border border-green-100">
                  <CheckCircle size={20} />
                  <span className="font-medium">
                    {mySubmission.status === 'late' ? 'Submitted Late' : 'Turned In'}
                  </span>
                </div>
                
                {assignment.type === 'file' ? (
                  <div className="border rounded-lg p-4 flex items-center justify-between">
                    <span className="font-medium truncate pr-4">{mySubmission.file_name}</span>
                    <a href={mySubmission.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm font-medium whitespace-nowrap">
                      View File
                    </a>
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <p className="text-gray-700 whitespace-pre-wrap">{mySubmission.content}</p>
                  </div>
                )}
                
                {mySubmission.status === 'graded' && (
                  <div className="mt-6 border-t pt-6">
                    <h3 className="font-semibold text-gray-900 mb-2">Grade: {mySubmission.score}/100</h3>
                    {mySubmission.feedback && (
                      <div className="bg-blue-50 text-blue-900 p-4 rounded-lg text-sm border border-blue-100">
                        <p className="font-semibold mb-1">Feedback from Mentor:</p>
                        <p>{mySubmission.feedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleStudentSubmit} className="space-y-6">
                {assignment.type === 'file' ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files[0])}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                      <UploadCloud size={48} className="text-gray-400 mb-4" />
                      <span className="text-sm font-medium text-gray-900">
                        {file ? file.name : 'Click to select a file'}
                      </span>
                      {!file && <span className="text-xs text-gray-500 mt-1">PDF, Word, Images, etc.</span>}
                    </label>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {assignment.type === 'link' ? 'Enter URL' : 'Your Answer'}
                    </label>
                    {assignment.type === 'link' ? (
                      <input 
                        type="url" 
                        required 
                        value={studentText}
                        onChange={(e) => setStudentText(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                        placeholder="https://"
                      />
                    ) : (
                      <textarea 
                        required 
                        rows="6"
                        value={studentText}
                        onChange={(e) => setStudentText(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                        placeholder="Type your answer here..."
                      />
                    )}
                  </div>
                )}

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading || (assignment.type === 'file' && !file)}
                  className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                  {uploading ? 'Turning In...' : 'Turn In'}
                </button>
              </form>
            )}
          </div>
        )}

        {userData?.role === 'mentor' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Student Submissions</h2>
              <span className="text-sm text-gray-500 font-medium">{submissions.length} total</span>
            </div>
            
            {submissions.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {submissions.map((sub) => (
                  <li key={sub.id} className="p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{sub.studentName}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            sub.status === 'graded' ? 'bg-green-100 text-green-800' :
                            sub.status === 'late' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {sub.status.toUpperCase()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} /> 
                            {new Date(sub.submitted_at).toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="mt-4">
                          {assignment.type === 'file' ? (
                            <a href={sub.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline font-medium text-sm">
                              View Attached File: {sub.file_name}
                            </a>
                          ) : (
                            <div className="bg-gray-50 p-3 rounded-lg border text-sm text-gray-700 whitespace-pre-wrap">
                              {sub.content}
                            </div>
                          )}
                        </div>
                        
                        {sub.status === 'graded' && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="font-medium text-gray-900">Score: {sub.score}/100</div>
                            {sub.feedback && <p className="text-sm text-gray-600 mt-1">Feedback: {sub.feedback}</p>}
                          </div>
                        )}
                      </div>
                      
                      {sub.status !== 'graded' && (
                        <button
                          onClick={() => {
                            setGradingSubmission(sub);
                            setScore('');
                            setFeedback('');
                          }}
                          className="shrink-0 px-4 py-2 border border-primary text-primary hover:bg-primary/5 font-medium text-sm rounded-lg transition-colors"
                        >
                          Grade
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No submissions have been turned in yet.
              </div>
            )}
          </div>
        )}

        {/* Grading Modal */}
        {gradingSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Grade {gradingSubmission.studentName}
                </h3>
              </div>
              
              <form onSubmit={handleGradeSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Score (0-100)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Provide constructive feedback..."
                  />
                </div>
                
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setGradingSubmission(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg"
                  >
                    Submit Grade
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
