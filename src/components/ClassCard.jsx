import { Link } from 'react-router-dom';
import { BookOpen, Users } from 'lucide-react';

export default function ClassCard({ classroom, role }) {
  return (
    <Link 
      to={`/c/${classroom.id}`}
      className="group block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="h-24 bg-gradient-to-r from-primary/80 to-primary p-4 flex flex-col justify-end">
        <h3 className="text-xl font-bold text-white truncate">{classroom.name}</h3>
      </div>
      
      <div className="p-4">
        <p className="text-sm text-gray-600 line-clamp-2 h-10 mb-4">
          {classroom.description || 'No description provided.'}
        </p>
        
        <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-1">
            {role === 'mentor' ? (
              <span className="font-mono bg-gray-100 px-2 py-1 rounded border">
                Code: {classroom.class_code}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <BookOpen size={14} /> Enrolled
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
