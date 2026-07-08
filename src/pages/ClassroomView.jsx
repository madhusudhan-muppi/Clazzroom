import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Users, FileText } from 'lucide-react';

export default function ClassroomView() {
  const { id } = useParams();
  const { userData } = useAuth();
  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClassroom() {
      try {
        const docRef = doc(db, 'classrooms', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setClassroom({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchClassroom();
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
          <h1 className="text-3xl font-bold text-gray-900">{classroom.name}</h1>
          {classroom.description && (
            <p className="mt-2 text-gray-600">{classroom.description}</p>
          )}
          
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
            {/* Stream Section (Coming in next phases) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 text-gray-900 font-medium border-b border-gray-100 pb-4 mb-4">
                <FileText size={20} className="text-primary" />
                Assignments & Announcements
              </div>
              <p className="text-gray-500 text-center py-10">
                Stream will be available in Phase 5 & 6.
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Sidebar info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">About</h3>
              <p className="text-sm text-gray-600">
                Created at {new Date(classroom.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
