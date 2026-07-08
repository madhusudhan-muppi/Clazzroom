import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { X, UploadCloud } from 'lucide-react';

export default function CreateAssignmentModal({ isOpen, onClose, onCreated, classroomId }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('file'); // 'file', 'short_answer', 'link'
  const [dueDate, setDueDate] = useState('');
  const [mentorFile, setMentorFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let mentorFileUrl = null;
      let mentorFileName = null;

      if (mentorFile) {
        mentorFileName = mentorFile.name;
        const storageRef = ref(storage, `assignments/${classroomId}/${mentorFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, mentorFile);
        
        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            null, 
            (error) => reject(error), 
            async () => {
              mentorFileUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      await addDoc(collection(db, `classrooms/${classroomId}/assignments`), {
        title,
        description,
        type,
        due_date: new Date(dueDate).toISOString(),
        mentor_file_url: mentorFileUrl,
        mentor_file_name: mentorFileName,
        created_at: new Date().toISOString(),
      });
      
      onCreated();
      onClose();
      
      // Reset form
      setTitle('');
      setDescription('');
      setType('file');
      setDueDate('');
      setMentorFile(null);
    } catch (err) {
      console.error(err);
      setError('Failed to create assignment.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-900">Create Assignment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Assignment Title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              required
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Instructions for the students"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Attach a file (Optional)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
              <input
                type="file"
                id="mentor-file"
                className="hidden"
                onChange={(e) => setMentorFile(e.target.files[0])}
              />
              <label htmlFor="mentor-file" className="cursor-pointer flex flex-col items-center">
                <UploadCloud size={24} className="text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-700">
                  {mentorFile ? mentorFile.name : 'Click to attach a file (e.g. syllabus or questions)'}
                </span>
              </label>
            </div>
            {mentorFile && (
              <button 
                type="button" 
                onClick={() => setMentorFile(null)}
                className="text-xs text-red-500 hover:underline mt-1"
              >
                Remove file
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student Submission Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white"
            >
              <option value="file">File Upload</option>
              <option value="short_answer">Short Answer</option>
              <option value="link">URL / Link</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="datetime-local"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-70 transition-colors"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
