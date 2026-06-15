import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, File, Loader2, ArrowRight, X, MessageSquare } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingDB, setIsCheckingDB] = useState(true);
  const [hasExistingDocs, setHasExistingDocs] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkDatabase = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/documents`);
        if (response.data.documents && response.data.documents.length > 0) {
          setHasExistingDocs(true);
        }
      } catch (err) {
        console.error('Failed to check database for existing documents', err);
      } finally {
        setIsCheckingDB(false);
      }
    };
    checkDatabase();
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
      if (droppedFiles.length > 0) {
        setFiles(prev => [...prev, ...droppedFiles]);
        setError('');
      } else {
        setError('Please upload valid PDF files.');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
      setFiles(prev => [...prev, ...selectedFiles]);
      setError('');
    }
  };

  const removeFile = (indexToRemove, e) => {
    e.stopPropagation();
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsLoading(true);
    setError('');

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200) {
        const filenames = files.map(f => f.name).join(', ');
        navigate('/chat', { state: { filename: filenames } });
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to upload documents. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="text-center mb-12 relative z-10">
        <h1 className="text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
          DocuMind
        </h1>
        <p className="text-lg text-[var(--color-text-muted)] max-w-md mx-auto">
          Upload your PDFs and chat across all of them using the power of local RAG.
        </p>
      </div>

      <div className="w-full max-w-xl glass-panel rounded-3xl p-8 relative z-10">
        
        {/* Drag & Drop Zone */}
        <div
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ease-out cursor-pointer group ${
            isDragging 
              ? 'border-green-500 bg-green-500/5 scale-[1.02]' 
              : 'border-white/20 hover:border-white/40 hover:bg-white/5'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isLoading && fileInputRef.current?.click()}
        >
          <input
            type="file"
            multiple
            className="hidden"
            accept="application/pdf"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={isLoading}
          />

          <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
            <div className="p-4 bg-white/5 rounded-full group-hover:scale-110 transition-transform duration-300">
              <UploadCloud className="w-10 h-10 text-[var(--color-text-muted)] group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-lg font-medium text-white mb-1">Click or drag PDFs to upload</p>
              <p className="text-sm text-[var(--color-text-muted)]">Upload as many as you need</p>
            </div>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-6 space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="p-2 bg-green-500/20 rounded-lg text-green-400 flex-shrink-0">
                    <File className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium text-white truncate max-w-[200px] sm:max-w-[300px]">{file.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => removeFile(idx, e)}
                  disabled={isLoading}
                  className="p-2 hover:bg-red-500/20 text-[var(--color-text-muted)] hover:text-red-400 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <div className="mt-8 flex justify-end space-x-4">
          {!isCheckingDB && hasExistingDocs && files.length === 0 && (
            <button
              onClick={() => navigate('/chat')}
              className="px-6 py-3 rounded-xl flex items-center space-x-2 bg-white/5 hover:bg-white/10 text-white transition-all duration-300"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Continue Chatting</span>
            </button>
          )}

          <button
            onClick={handleUpload}
            disabled={files.length === 0 || isLoading}
            className={`px-6 py-3 rounded-xl flex items-center space-x-2 transition-all duration-300 ${
              files.length === 0 
                ? 'bg-white/5 text-white/40 cursor-not-allowed' 
                : 'primary-button'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Upload & Chat</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
