import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Users, FileText, Plus } from 'lucide-react';
import CreateAssignmentModal from '../components/CreateAssignmentModal';
import Announcements from '../components/Announcements';

export default function ClassroomView() {
  const { id } = useParams();
  const { userData } = useAuth();
  const [classroom, setClassroom] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

  async function fetchClassroomAndAssignments() {
    try {
      const docRef = doc(db, 'classrooms', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setClassroom({ id: docSnap.id, ...docSnap.data() });
      }

      // Fetch assignments
      const assignmentsRef = collection(db, `classrooms/${id}/assignments`);
      const q = query(assignmentsRef, orderBy('created_at', 'desc'));
      const assignmentSnap = await getDocs(q);
      setAssignments(assignmentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClassroomAndAssignments();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse bg-gray-200 h-10 w-40 rounded"></div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-4">
        <h2 className="text-xl font-bold text-gray-900">Classroom not found</h2>
        <Link to="/" className="text-primary hover:underline flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{classroom.name}</h1>
              {classroom.description && (
                <p className="mt-2 text-gray-600">{classroom.description}</p>
              )}
            </div>
            {userData?.role === 'mentor' && (
              <button
                onClick={() => setIsAssignmentModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm"
              >
                <Plus size={16} /> Create Assignment
              </button>
            )}
          </div>
          
          <div className="mt-6 flex flex-wrap gap-4">
            {userData?.role === 'mentor' && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium font-mono">
                Code: {classroom.class_code}
              </div>
            )}
            <div className="inline-flex items-center gap-2 text-gray-500 text-sm">
              <Users size={16} /> Class Stream
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Announcements Stream */}
            <Announcements classroomId={id} />

          </div>
          
          <div className="space-y-6">
            
            {/* Assignments List in Sidebar */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText size={20} className="text-primary" /> Assignments
              </h2>
              
              {assignments.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
                  {assignments.map(assignment => (
                    <Link
                      key={assignment.id}
                      to={`/c/${id}/a/${assignment.id}`}
                      className="block p-4 hover:bg-gray-50 transition-colors"
                    >
                      <h3 className="text-sm font-medium text-gray-900 mb-1">{assignment.title}</h3>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                  No assignments yet.
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">About</h3>
              <p className="text-sm text-gray-600">
                Created on {new Date(classroom.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </main>

      {userData?.role === 'mentor' && (
        <CreateAssignmentModal
          isOpen={isAssignmentModalOpen}
          onClose={() => setIsAssignmentModalOpen(false)}
          onCreated={fetchClassroomAndAssignments}
          classroomId={id}
        />
      )}
    </div>
  );
}
