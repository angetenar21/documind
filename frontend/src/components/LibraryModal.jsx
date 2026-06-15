import React, { useState, useEffect } from 'react';
import { X, Trash2, Database, Loader2, File } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function LibraryModal({ isOpen, onClose }) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingFile, setDeletingFile] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/documents`);
      setDocuments(response.data.documents || []);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (filename) => {
    setDeletingFile(filename);
    try {
      await axios.delete(`${API_BASE_URL}/documents/${filename}`);
      setDocuments(documents.filter(doc => doc !== filename));
    } catch (err) {
      console.error('Failed to delete document', err);
    } finally {
      setDeletingFile(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#18181b] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-500/20 rounded-xl">
              <Database className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Your Library</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
              <p className="text-sm text-zinc-400">Loading database...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-zinc-400">Your database is completely empty.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group"
                >
                  <div className="flex items-center space-x-3 overflow-hidden pr-4">
                    <File className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    <span className="text-sm text-zinc-200 truncate">{doc}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(doc)}
                    disabled={deletingFile === doc}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-100"
                    title="Delete document"
                  >
                    {deletingFile === doc ? (
                      <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
