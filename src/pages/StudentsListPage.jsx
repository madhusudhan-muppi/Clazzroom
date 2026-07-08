import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, User, FolderOpen } from 'lucide-react';
import TimelineBadge from '../components/TimelineBadge';
import { PROJECT_STAGES, STAGE_STATUS } from '../lib/stages';

export default function StudentsListPage() {
  const { classId } = useParams();
  const { userData } = useAuth();
  const [classroom, setClassroom] = useState(null);
  const [students, setStudents] = useState([]); // { id, name, projects: [...] }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch classroom
        const classDoc = await getDoc(doc(db, 'classrooms', classId));
        if (classDoc.exists()) {
          setClassroom({ id: classDoc.id, ...classDoc.data() });
        }

        // Fetch all projects in the class
        const projectsSnap = await getDocs(collection(db, `classrooms/${classId}/projects`));
        const projectsByStudent = {};

        projectsSnap.docs.forEach((d) => {
          const data = d.data();
          const sid = data.student_id;
          if (!projectsByStudent[sid]) {
            projectsByStudent[sid] = {
              id: sid,
              name: data.student_name,
              projects: [],
            };
          }
          projectsByStudent[sid].projects.push({ id: d.id, ...data });
        });

        // Sort students alphabetically
        const sorted = Object.values(projectsByStudent).sort((a, b) => a.name.localeCompare(b.name));
        setStudents(sorted);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [classId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse bg-gray-200 h-10 w-40 rounded"></div>
      </div>
    );
  }

  // Get current stage name for a project
  function getCurrentStageName(stages) {
    // The current stage is the first non-approved stage
    const idx = stages.findIndex(s => s.status !== STAGE_STATUS.APPROVED);
    if (idx === -1) return 'Completed';
    return stages[idx].name;
  }

  function getCurrentStageStatus(stages) {
    const idx = stages.findIndex(s => s.status !== STAGE_STATUS.APPROVED);
    if (idx === -1) return STAGE_STATUS.APPROVED;
    return stages[idx].status;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link to={`/c/${classId}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to Classroom
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Student Projects</h1>
          <p className="mt-2 text-gray-600">View all student projects and their progress</p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {students.length > 0 ? (
          <div className="space-y-6">
            {students.map((student) => (
              <div key={student.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase">
                    {student.name?.[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{student.name}</h3>
                    <p className="text-xs text-gray-500">{student.projects.length} project{student.projects.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <ul className="divide-y divide-gray-100">
                  {student.projects.map((project) => (
                    <li key={project.id}>
                      <Link
                        to={`/c/${classId}/project/${project.id}`}
                        className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FolderOpen size={18} className="text-gray-400 shrink-0" />
                          <div className="min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{project.topic}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Stage: {getCurrentStageName(project.stages)}
                              {getCurrentStageStatus(project.stages) === STAGE_STATUS.SUBMITTED && (
                                <span className="ml-2 text-amber-600 font-medium">• Awaiting Review</span>
                              )}
                              {getCurrentStageStatus(project.stages) === STAGE_STATUS.REJECTED && (
                                <span className="ml-2 text-red-600 font-medium">• Needs Revision</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 ml-4">
                          {classroom?.project_start_date && classroom?.project_end_date ? (
                            <TimelineBadge
                              stages={project.stages}
                              startDate={classroom.project_start_date}
                              endDate={classroom.project_end_date}
                              customDurations={classroom.custom_durations}
                            />
                          ) : (
                            <span className="text-xs text-gray-400 italic">No timeline set</span>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-12 text-center">
            <User size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No student projects yet</h3>
            <p className="text-gray-500">Students will appear here once they register a project in this class.</p>
          </div>
        )}
      </main>
    </div>
  );
}
