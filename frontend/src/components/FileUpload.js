import { useState, useCallback } from "react";
import { Upload, X, File, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const FileUpload = ({ onFilesSelected, maxFiles = 5, maxSizeMB = 10, accept = "*" }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file) => {
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`${file.name} çok büyük. Maksimum ${maxSizeMB}MB olabilir.`);
      return false;
    }
    return true;
  };

  const processFiles = (files) => {
    const validFiles = Array.from(files).filter(validateFile);
    
    if (selectedFiles.length + validFiles.length > maxFiles) {
      toast.error(`Maksimum ${maxFiles} dosya yükleyebilirsiniz.`);
      return;
    }

    const newFiles = validFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substring(7),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      name: file.name,
      size: file.size,
      type: file.type
    }));

    const updatedFiles = [...selectedFiles, ...newFiles];
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  }, [selectedFiles]);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (id) => {
    const updatedFiles = selectedFiles.filter((f) => f.id !== id);
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div
        data-testid="file-upload-dropzone"
        className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          data-testid="file-input"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          multiple
          accept={accept}
          onChange={handleChange}
        />
        
        <div className="flex flex-col items-center justify-center text-center">
          <Upload className={`w-12 h-12 mb-4 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
          <p className="text-sm font-medium mb-1">
            Dosyaları sürükleyip bırakın veya tıklayın
          </p>
          <p className="text-xs text-muted-foreground">
            Maksimum {maxFiles} dosya, dosya başına {maxSizeMB}MB
          </p>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Seçilen Dosyalar ({selectedFiles.length})</p>
          <div className="grid gap-2">
            {selectedFiles.map((fileObj) => (
              <Card key={fileObj.id} className="p-3">
                <div className="flex items-center gap-3">
                  {fileObj.preview ? (
                    <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-muted">
                      <img 
                        src={fileObj.preview} 
                        alt={fileObj.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <File className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileObj.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(fileObj.size)}
                    </p>
                  </div>
                  
                  <Button
                    data-testid={`remove-file-${fileObj.id}`}
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(fileObj.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const ImageViewer = ({ images, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={onClose}>
      <button
        className="absolute top-4 right-4 text-white hover:text-gray-300"
        onClick={onClose}
      >
        <X className="w-8 h-8" />
      </button>

      <div className="relative max-w-5xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
        <img
          src={currentImage.url || currentImage.file_data}
          alt={currentImage.filename || 'Image'}
          className="max-w-full max-h-full object-contain rounded-lg"
        />
        
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black/50 px-4 py-2 rounded-full">
            {images.map((_, idx) => (
              <button
                key={idx}
                className={`w-2 h-2 rounded-full ${idx === currentIndex ? 'bg-white' : 'bg-white/50'}`}
                onClick={() => setCurrentIndex(idx)}
              />
            ))}
          </div>
        )}

        {images.length > 1 && (
          <>
            {currentIndex > 0 && (
              <button
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                onClick={() => setCurrentIndex(currentIndex - 1)}
              >
                ←
              </button>
            )}
            {currentIndex < images.length - 1 && (
              <button
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                onClick={() => setCurrentIndex(currentIndex + 1)}
              >
                →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
