import React, { useState, useRef, useEffect } from 'react';
import { createWorker } from 'tesseract.js';

const GalleryScreen = ({ image, onAddItem, onBackToCamera, packagingUnits }) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showZoomedArea, setShowZoomedArea] = useState(false);
  const [formData, setFormData] = useState({
    productNumber: '',
    unit: packagingUnits[0] || '카톤',
    quantity: '',
    expiryDate: ''
  });
  const [recognizedText, setRecognizedText] = useState('');
  
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    console.log('GalleryScreen: image prop received:', image ? '이미지 있음' : '이미지 없음');
    
    if (image && canvasRef.current) {
      const img = new Image();
      
      img.onload = () => {
        console.log('이미지 로드 완료:', img.width, 'x', img.height);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // 캔버스 크기를 컨테이너에 맞춤
        const container = containerRef.current;
        if (!container) {
          console.error('컨테이너를 찾을 수 없습니다');
          return;
        }
        
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        console.log('컨테이너 크기:', containerWidth, 'x', containerHeight);
        
        const imgAspectRatio = img.width / img.height;
        const containerAspectRatio = containerWidth / containerHeight;
        
        let canvasWidth, canvasHeight;
        
        if (imgAspectRatio > containerAspectRatio) {
          canvasWidth = containerWidth;
          canvasHeight = containerWidth / imgAspectRatio;
        } else {
          canvasHeight = containerHeight;
          canvasWidth = containerHeight * imgAspectRatio;
        }
        
        console.log('캔버스 크기 설정:', canvasWidth, 'x', canvasHeight);
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        // 캔버스 초기화
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // 이미지를 캔버스에 그리기
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        
        setImageLoaded(true);
        console.log('이미지가 캔버스에 그려졌습니다');
      };
      
      img.onerror = (error) => {
        console.error('이미지 로드 실패:', error);
        alert('이미지를 로드할 수 없습니다. 다시 촬영해주세요.');
      };
      
      img.src = image;
    } else {
      console.log('이미지 또는 캔버스가 없습니다');
      setImageLoaded(false);
    }
  }, [image]);

  const handleImageClick = (e) => {
    if (!isSelecting) {
      setIsSelecting(true);
      const rect = canvasRef.current.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      
      // 확대된 영역에서는 좌표를 조정
      if (showZoomedArea) {
        x = x / 2;
        y = y / 2;
      }
      
      setSelection({
        startX: x,
        startY: y,
        endX: x,
        endY: y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isSelecting && selection) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setSelection({
        ...selection,
        endX: x,
        endY: y
      });
    }
  };

  const handleMouseUp = async () => {
    if (isSelecting && selection) {
      setIsSelecting(false);
      await performOCR();
    }
  };

  const performOCR = async () => {
    if (!selection) return;
    
    setIsProcessing(true);
    
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // 선택 영역 계산
      const startX = Math.min(selection.startX, selection.endX);
      const startY = Math.min(selection.startY, selection.endY);
      const width = Math.abs(selection.endX - selection.startX);
      const height = Math.abs(selection.endY - selection.startY);
      
      // 선택 영역을 새로운 캔버스에 복사
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      
      tempCtx.drawImage(
        canvas,
        startX, startY, width, height,
        0, 0, width, height
      );
      
      // OCR 워커 생성 및 실행
      const worker = await createWorker('kor+eng');
      
      const { data: { text } } = await worker.recognize(tempCanvas);
      
      // 숫자만 추출
      const numbers = text.match(/\d+/g);
      const recognizedNumber = numbers ? numbers.join('') : '';
      
      setRecognizedText(text);
      setFormData(prev => ({
        ...prev,
        productNumber: recognizedNumber
      }));
      
      await worker.terminate();
      
    } catch (error) {
      console.error('OCR 오류:', error);
      alert('텍스트 인식에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = () => {
    if (!formData.productNumber || !formData.quantity) {
      alert('품번과 수량을 입력해주세요.');
      return;
    }
    
    onAddItem({
      ...formData
    });
  };

  const handleRetake = () => {
    onBackToCamera();
  };

  const selectGuideArea = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    
    // 가이드 라인 영역 (화면 중앙 200x80 영역)
    const guideWidth = 200;
    const guideHeight = 80;
    
    // 캔버스에서의 가이드 영역 위치 계산
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // 화면 중앙을 기준으로 가이드 영역 계산
    const startX = (canvasWidth - guideWidth) / 2;
    const startY = (canvasHeight - guideHeight) / 2;
    
    setSelection({
      startX: startX,
      startY: startY,
      endX: startX + guideWidth,
      endY: startY + guideHeight
    });
    
    // 가이드 영역을 자동으로 OCR 실행
    setTimeout(() => {
      performOCR();
    }, 500);
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#000',
      position: 'relative'
    }}>
      {/* 헤더 */}
      <div style={{
        padding: '16px',
        backgroundColor: '#333',
        color: 'white',
        textAlign: 'center',
        zIndex: 20
      }}>
        <h2>품번 영역 선택</h2>
        <button
          onClick={selectGuideArea}
          className="btn btn-primary"
          style={{ fontSize: '14px', padding: '8px 16px', marginTop: '8px' }}
        >
          가이드 영역 자동 선택
        </button>
      </div>

      {/* 전체 이미지 영역 */}
      <div 
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden'
        }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleImageClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            cursor: isSelecting ? 'crosshair' : 'pointer',
            border: '1px solid #ccc',
            backgroundColor: '#f0f0f0'
          }}
        />
        
        {/* 이미지 로딩 상태 표시 */}
        {!imageLoaded && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            textAlign: 'center'
          }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
            <p>이미지를 로드하고 있습니다...</p>
          </div>
        )}
        
        {/* 선택 영역 표시 */}
        {selection && !showZoomedArea && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(selection.startX, selection.endX),
              top: Math.min(selection.startY, selection.endY),
              width: Math.abs(selection.endX - selection.startX),
              height: Math.abs(selection.endY - selection.startY),
              border: '3px solid #00ff00',
              backgroundColor: 'rgba(0, 255, 0, 0.3)',
              pointerEvents: 'none',
              boxShadow: '0 0 10px rgba(0, 255, 0, 0.5)'
            }}
          />
        )}

        {/* 가이드 영역 하이라이트 */}
        {!selection && imageLoaded && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '200px',
              height: '80px',
              border: '2px dashed #00ff00',
              backgroundColor: 'rgba(0, 255, 0, 0.1)',
              pointerEvents: 'none',
              opacity: 0.7
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-25px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: '#00ff00',
              fontSize: '12px',
              fontWeight: 'bold',
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: '2px 6px',
              borderRadius: '3px'
            }}>
              가이드 영역
            </div>
          </div>
        )}
        
        {/* 확대된 영역 표시 */}
        {showZoomedArea && selection && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10
          }}>
            <div style={{
              position: 'relative',
              width: '80%',
              height: '60%',
              border: '3px solid #00ff00',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <canvas
                ref={canvasRef}
                onClick={handleImageClick}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scale(2)',
                  transformOrigin: 'center',
                  cursor: isSelecting ? 'crosshair' : 'pointer'
                }}
              />
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                color: '#00ff00',
                fontSize: '14px',
                fontWeight: 'bold',
                backgroundColor: 'rgba(0,0,0,0.7)',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                2배 확대된 품번 영역
              </div>
              <button
                onClick={() => setShowZoomedArea(false)}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(255,255,255,0.9)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        {/* 로딩 오버레이 */}
        {isProcessing && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
              <p>품번을 인식하고 있습니다...</p>
            </div>
          </div>
        )}
      </div>

      {/* 플로팅 입력 폼 */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        right: '20px',
        backgroundColor: 'white',
        padding: '16px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        zIndex: 30
      }}>
        {/* 품번 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <label style={{ width: '60px', fontSize: '14px', fontWeight: '600', color: '#333' }}>품번</label>
          <input
            type="text"
            value={formData.productNumber}
            onChange={(e) => handleInputChange('productNumber', e.target.value)}
            placeholder="품번을 입력하거나 영역을 선택하세요"
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '2px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>
        {recognizedText && (
          <small style={{ color: '#666', marginBottom: '12px', display: 'block', fontSize: '12px' }}>
            인식된 텍스트: {recognizedText}
          </small>
        )}

        {/* 포장단위 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <label style={{ width: '60px', fontSize: '14px', fontWeight: '600', color: '#333' }}>단위</label>
          <select
            value={formData.unit}
            onChange={(e) => handleInputChange('unit', e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '2px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            {packagingUnits.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>

        {/* 수량 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <label style={{ width: '60px', fontSize: '14px', fontWeight: '600', color: '#333' }}>수량</label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => handleInputChange('quantity', e.target.value)}
            placeholder="수량을 입력하세요"
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '2px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* 유통기한 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <label style={{ width: '60px', fontSize: '14px', fontWeight: '600', color: '#333' }}>유통기한</label>
          <input
            type="text"
            value={formData.expiryDate}
            onChange={(e) => handleInputChange('expiryDate', e.target.value)}
            placeholder="YYYYMMDD (선택)"
            maxLength="8"
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '2px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* 버튼 영역 */}
        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={handleRetake}
            className="btn btn-secondary"
            style={{ flex: 1, padding: '10px' }}
          >
            다시 촬영
          </button>
          
          <button
            onClick={handleSubmit}
            className="btn btn-success"
            style={{ flex: 1, padding: '10px' }}
            disabled={isProcessing}
          >
            입력
          </button>
        </div>
      </div>
    </div>
  );
};

export default GalleryScreen; 