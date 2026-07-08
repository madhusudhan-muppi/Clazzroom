import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare, Send } from 'lucide-react';

export default function Announcements({ classroomId }) {
  const [announcements, setAnnouncements] = useState([]);
  const [newContent, setNewContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const { userData, currentUser } = useAuth();

  useEffect(() => {
    const q = query(
      collection(db, 'announcements'),
      where('classroom_id', '==', classroomId),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ann = [];
      snapshot.forEach((doc) => {
        ann.push({ id: doc.id, ...doc.data() });
      });
      setAnnouncements(ann);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching announcements realtime:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [classroomId]);

  async function handlePost(e) {
    e.preventDefault();
    if (!newContent.trim()) return;
    
    setPosting(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        classroom_id: classroomId,
        author_id: currentUser.uid,
        author_name: userData.full_name,
        content: newContent.trim(),
        created_at: new Date().toISOString()
      });
      setNewContent('');
    } catch (err) {
      console.error(err);
      alert('Failed to post announcement');
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="space-y-6">
      {userData?.role === 'mentor' && (
        <form onSubmit={handlePost} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <textarea
            required
            rows="3"
            placeholder="Announce something to your class..."
            className="w-full resize-none border-none focus:ring-0 p-2 text-gray-900 bg-gray-50 rounded-lg placeholder-gray-400"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
          />
          <div className="flex justify-end mt-3">
            <button
              type="submit"
              disabled={posting || !newContent.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send size={16} />
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="animate-pulse bg-gray-200 h-24 rounded-xl"></div>
        ) : announcements.length > 0 ? (
          announcements.map((ann) => (
            <div key={ann.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {ann.author_name?.[0]?.toUpperCase() || 'M'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{ann.author_name}</h4>
                    <p className="text-xs text-gray-500">
                      {new Date(ann.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-gray-800 whitespace-pre-wrap">{ann.content}</p>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-8 text-center flex flex-col items-center">
            <MessageSquare size={32} className="text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium text-sm">No announcements yet.</p>
            <p className="text-gray-400 text-xs mt-1">This is where mentors communicate with the class.</p>
          </div>
        )}
      </div>
    </div>
  );
}
