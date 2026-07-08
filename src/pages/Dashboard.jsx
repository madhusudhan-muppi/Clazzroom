import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Plus } from 'lucide-react';
import { collection, query, where, getDocs, collectionGroup, documentId } from 'firebase/firestore';
import { db } from '../lib/firebase';
import ClassCard from '../components/ClassCard';
import CreateClassModal from '../components/CreateClassModal';
import JoinClassModal from '../components/JoinClassModal';

export default function Dashboard() {
  const { userData, currentUser, logout } = useAuth();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function fetchClassrooms() {
    setLoading(true);
    try {
      if (userData?.role === 'mentor') {
        // Fetch classes created by this mentor
        const q = query(collection(db, 'classrooms'), where('mentor_id', '==', currentUser.uid));
        const snapshot = await getDocs(q);
        const classes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClassrooms(classes);
      } else if (userData?.role === 'student') {
        // Fetch classes this student is a member of using a Collection Group query
        // This requires an index in Firestore on 'members' subcollection
        const membersRef = collectionGroup(db, 'members');
        const q = query(membersRef, where('student_id', '==', currentUser.uid));
        const membershipSnapshot = await getDocs(q);
        
        const classIds = membershipSnapshot.docs.map(doc => doc.ref.parent.parent.id);
        
        if (classIds.length > 0) {
          // Chunk classIds into groups of 10 for the 'in' query
          const classChunks = [];
          for (let i = 0; i < classIds.length; i += 10) {
            classChunks.push(classIds.slice(i, i + 10));
          }
          
          let allClasses = [];
          for (const chunk of classChunks) {
            const classQuery = query(collection(db, 'classrooms'), where(documentId(), 'in', chunk));
            const classSnap = await getDocs(classQuery);
            allClasses = [...allClasses, ...classSnap.docs.map(d => ({ id: d.id, ...d.data() }))];
          }
          setClassrooms(allClasses);
        } else {
          setClassrooms([]);
        }
      }
    } catch (err) {
      console.error("Error fetching classrooms:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userData && currentUser) {
      fetchClassrooms();
    }
  }, [userData, currentUser]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold">C</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Clazzroom</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
              >
                <Plus size={16} />
                {userData?.role === 'mentor' ? 'Create Class' : 'Join Class'}
              </button>
              
              <div className="h-6 w-px bg-gray-300 mx-2"></div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {userData?.full_name}
                </span>
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase">
                  {userData?.full_name?.[0]}
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  title="Log out"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-sm text-gray-500 mt-1">
              {userData?.role === 'mentor' 
                ? 'Manage your classrooms and assignments' 
                : 'View your enrolled classes and tasks'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-gray-200 h-40 rounded-xl"></div>
            ))}
          </div>
        ) : classrooms.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {classrooms.map(cls => (
              <ClassCard key={cls.id} classroom={cls} role={userData?.role} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No classes yet</h3>
            <p className="text-gray-500 mb-6">
              {userData?.role === 'mentor' 
                ? 'Create your first classroom to get started.' 
                : 'Join a classroom using a code provided by your mentor.'}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
            >
              <Plus size={16} />
              {userData?.role === 'mentor' ? 'Create a Class' : 'Join a Class'}
            </button>
          </div>
        )}
      </main>

      {userData?.role === 'mentor' ? (
        <CreateClassModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onCreated={fetchClassrooms} 
        />
      ) : (
        <JoinClassModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onJoined={fetchClassrooms} 
        />
      )}
    </div>
  );
}
