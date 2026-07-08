import { useState } from 'react';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { X } from 'lucide-react';

export default function JoinClassModal({ isOpen, onClose, onJoined }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const sanitizedCode = code.trim().toUpperCase();

    try {
      // 1. Find classroom by code
      const q = query(collection(db, 'classrooms'), where('class_code', '==', sanitizedCode));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('No classroom found with that code.');
        setLoading(false);
        return;
      }
      
      const classroomDoc = querySnapshot.docs[0];
      const classroomId = classroomDoc.id;
      
      // 2. Add student to the members subcollection
      await setDoc(doc(db, `classrooms/${classroomId}/members`, currentUser.uid), {
        student_id: currentUser.uid,
        role_in_class: 'student',
        joined_at: new Date().toISOString()
      });
      
      onJoined();
      onClose();
      setCode('');
    } catch (err) {
      console.error(err);
      setError('Failed to join classroom. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Join Class</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Code</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary uppercase tracking-widest font-mono text-center"
              placeholder="6-CHAR CODE"
              maxLength={6}
            />
            <p className="mt-2 text-xs text-gray-500 text-center">
              Ask your mentor for the class code, then enter it here.
            </p>
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || code.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-70 transition-colors"
            >
              {loading ? 'Joining...' : 'Join'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
