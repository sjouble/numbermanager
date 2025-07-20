import React, { useState, useRef, useEffect } from 'react';
import { createWorker } from 'tesseract.js';

const GalleryScreen = ({ image, onAddItem, onBackToCamera, packagingUnits }) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showZoomedArea, setShowZoomedArea] = useState(false);
  const [scale, setScale] = useState(2.5);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
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
    
    // 이미지가 로드되면 자동으로 선택 모드 활성화
    if (image) {
      setIsSelecting(true);
    }
    
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
      const canvas = canvasRef.current;
      
      // 1. 클릭 좌표를 화면 기준으로 변환
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      
      // 2. 확대/이동 효과를 제거하여 실제 캔버스 좌표 계산
      x = (x - pan.x) / scale;
      y = (y - pan.y) / scale;
      
      // 3. 캔버스 크기에 맞게 정규화
      x = (x / rect.width) * canvas.width;
      y = (y / rect.height) * canvas.height;
      
      // 4. 경계 제한
      x = Math.max(0, Math.min(x, canvas.width));
      y = Math.max(0, Math.min(y, canvas.height));
      
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
      const canvas = canvasRef.current;
      
      // 1. 마우스 좌표를 화면 기준으로 변환
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      
      // 2. 확대/이동 효과를 제거하여 실제 캔버스 좌표 계산
      x = (x - pan.x) / scale;
      y = (y - pan.y) / scale;
      
      // 3. 캔버스 크기에 맞게 정규화
      x = (x / rect.width) * canvas.width;
      y = (y / rect.height) * canvas.height;
      
      // 4. 경계 제한
      x = Math.max(0, Math.min(x, canvas.width));
      y = Math.max(0, Math.min(y, canvas.height));
      
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
      
      // 선택 영역 계산 (정확한 좌표)
      const startX = Math.max(0, Math.min(selection.startX, selection.endX));
      const startY = Math.max(0, Math.min(selection.startY, selection.endY));
      const endX = Math.min(canvas.width, Math.max(selection.startX, selection.endX));
      const endY = Math.min(canvas.height, Math.max(selection.startY, selection.endY));
      const width = endX - startX;
      const height = endY - startY;
      
      console.log('OCR 영역:', { startX, startY, endX, endY, width, height });
      
      // 최소 크기 보장
      const finalWidth = Math.max(width, 30);
      const finalHeight = Math.max(height, 15);
      
      // 선택 영역을 새로운 캔버스에 복사 (3배 해상도로 증가)
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = finalWidth * 3;
      tempCanvas.height = finalHeight * 3;
      const tempCtx = tempCanvas.getContext('2d');
      
      // 이미지 스무딩 비활성화로 선명도 향상
      tempCtx.imageSmoothingEnabled = false;
      
      // 선택 영역을 고해상도로 복사
      tempCtx.drawImage(
        canvas,
        startX, startY, finalWidth, finalHeight,
        0, 0, finalWidth * 3, finalHeight * 3
      );
      
      // 이미지 전처리: 대비 향상 및 노이즈 제거
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imageData.data;
      
      // 그레이스케일 변환 및 대비 향상
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // 그레이스케일 변환
        const gray = r * 0.299 + g * 0.587 + b * 0.114;
        
        // 대비 향상 (더 강한 대비)
        const enhanced = Math.max(0, Math.min(255, (gray - 128) * 2.0 + 128));
        
        // 이진화 (흑백으로 변환)
        const binary = enhanced > 128 ? 255 : 0;
        
        data[i] = binary;     // R
        data[i + 1] = binary; // G
        data[i + 2] = binary; // B
        // Alpha는 그대로 유지
      }
      
      tempCtx.putImageData(imageData, 0, 0);
      
      // OCR 워커 생성 및 실행
      const worker = await createWorker('kor+eng');
      
      // OCR 설정 최적화
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허기니디리미비시이지치키티피히구누두루무부수우주추쿠투푸후그느드르므브스으즈츠크트프흐',
        tessedit_pageseg_mode: '7', // 단일 텍스트 라인
        tessedit_ocr_engine_mode: '3', // 기본 OCR 엔진
        preserve_interword_spaces: '1',
        tessedit_do_invert: '0' // 이미지 반전 비활성화
      });
      
      const { data: { text } } = await worker.recognize(tempCanvas);
      
      console.log('OCR 원본 텍스트:', text);
      
      // 텍스트 정제 및 숫자 추출
      let cleanedText = text.replace(/[^\w가-힣]/g, ''); // 특수문자 제거
      const numbers = cleanedText.match(/\d+/g);
      const letters = cleanedText.match(/[A-Za-z가-힣]+/g);
      
      let recognizedNumber = '';
      if (numbers && numbers.length > 0) {
        // 가장 긴 숫자 조합 선택
        recognizedNumber = numbers.reduce((longest, current) => 
          current.length > longest.length ? current : longest, '');
      } else if (letters && letters.length > 0) {
        // 숫자가 없으면 알파벳/한글 조합 사용
        recognizedNumber = letters.join('');
      }
      
      console.log('정제된 텍스트:', cleanedText);
      console.log('인식된 품번:', recognizedNumber);
      
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

  // 가이드 영역 자동 선택 함수 제거 (수동 선택만 사용)

  // 터치 이벤트 핸들러
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = canvasRef.current.getBoundingClientRect();
      const canvas = canvasRef.current;
      
      // 1. 터치 좌표를 화면 기준으로 변환
      let x = touch.clientX - rect.left;
      let y = touch.clientY - rect.top;
      
      // 2. 확대/이동 효과를 제거하여 실제 캔버스 좌표 계산
      // 캔버스의 CSS transform: scale(2.5) translate(pan.x/scale, pan.y/scale)
      x = (x - pan.x) / scale;
      y = (y - pan.y) / scale;
      
      // 3. 캔버스 크기에 맞게 정규화
      x = (x / rect.width) * canvas.width;
      y = (y / rect.height) * canvas.height;
      
      // 4. 경계 제한
      x = Math.max(0, Math.min(x, canvas.width));
      y = Math.max(0, Math.min(y, canvas.height));
      
      console.log('터치 좌표 변환:', {
        touch: { x: touch.clientX, y: touch.clientY },
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        canvas: { width: canvas.width, height: canvas.height },
        transformed: { x, y },
        scale,
        pan
      });
      
      if (isSelecting) {
        setSelection({
          startX: x,
          startY: y,
          endX: x,
          endY: y
        });
      } else {
        setDragStart({
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top
        });
        setIsDragging(true);
      }
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    
    if (e.touches.length === 2) {
      // 핀치 줌
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      if (this.lastDistance) {
        const scaleChange = distance / this.lastDistance;
        setScale(prev => Math.min(Math.max(prev * scaleChange, 0.5), 5));
      }
      
      this.lastDistance = distance;
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = canvasRef.current.getBoundingClientRect();
      
      if (isSelecting && selection) {
        // 선택 영역 업데이트
        const canvas = canvasRef.current;
        
        // 1. 터치 좌표를 화면 기준으로 변환
        let x = touch.clientX - rect.left;
        let y = touch.clientY - rect.top;
        
        // 2. 확대/이동 효과를 제거하여 실제 캔버스 좌표 계산
        x = (x - pan.x) / scale;
        y = (y - pan.y) / scale;
        
        // 3. 캔버스 크기에 맞게 정규화
        x = (x / rect.width) * canvas.width;
        y = (y / rect.height) * canvas.height;
        
        // 4. 경계 제한
        x = Math.max(0, Math.min(x, canvas.width));
        y = Math.max(0, Math.min(y, canvas.height));
        
        setSelection({
          ...selection,
          endX: x,
          endY: y
        });
      } else if (isDragging) {
        // 드래그 모드
        const currentX = touch.clientX - rect.left;
        const currentY = touch.clientY - rect.top;
        
        setPan(prev => ({
          x: prev.x + (currentX - dragStart.x),
          y: prev.y + (currentY - dragStart.y)
        }));
        
        setDragStart({ x: currentX, y: currentY });
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      this.lastDistance = null;
      
      // 선택 모드에서 터치가 끝나면 선택 완료 (OCR은 버튼으로 실행)
      if (isSelecting && selection) {
        console.log('영역 선택 완료:', selection);
      }
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(Math.max(prev * delta, 0.5), 5));
  };

  const resetView = () => {
    setScale(2.5);
    setPan({ x: 0, y: 0 });
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
        <p style={{ fontSize: '14px', marginTop: '4px', marginBottom: '12px', opacity: 0.8 }}>
          이미지에서 품번 영역을 드래그하여 선택하세요
        </p>
        <div style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'center',
          marginTop: '8px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => {
              setSelection(null);
              setRecognizedText('');
              setFormData(prev => ({ ...prev, productNumber: '' }));
              setIsSelecting(true);
            }}
            className="btn btn-secondary"
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            다시 선택
          </button>
          <button
            onClick={() => {
              if (selection) {
                performOCR();
              } else {
                alert('먼저 품번 영역을 선택해주세요.');
              }
            }}
            className="btn btn-success"
            style={{ fontSize: '14px', padding: '8px 16px' }}
          >
            선택 확인
          </button>
        </div>
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
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden'
        }}>
          <canvas
            ref={canvasRef}
            onClick={handleImageClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              cursor: isSelecting ? 'crosshair' : 'pointer',
              border: '1px solid #ccc',
              backgroundColor: '#f0f0f0',
              transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`,
              transformOrigin: 'center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
          />
        </div>
        
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
        {selection && !showZoomedArea && (() => {
          const rect = canvasRef.current?.getBoundingClientRect();
          const canvas = canvasRef.current;
          if (!rect || !canvas) return null;
          
          // 캔버스 좌표를 화면 좌표로 변환 (2.5배 확대 고려)
          const displayX = Math.min(selection.startX, selection.endX) * (rect.width / canvas.width);
          const displayY = Math.min(selection.startY, selection.endY) * (rect.height / canvas.height);
          const displayWidth = Math.abs(selection.endX - selection.startX) * (rect.width / canvas.width);
          const displayHeight = Math.abs(selection.endY - selection.startY) * (rect.height / canvas.height);
          
          // 확대/이동 효과를 적용한 최종 화면 좌표
          const finalX = displayX * scale + pan.x;
          const finalY = displayY * scale + pan.y;
          const finalWidth = displayWidth * scale;
          const finalHeight = displayHeight * scale;
          
          return (
            <div
              style={{
                position: 'absolute',
                left: finalX,
                top: finalY,
                width: finalWidth,
                height: finalHeight,
                border: '3px solid #00ff00',
                backgroundColor: 'rgba(0, 255, 0, 0.3)',
                pointerEvents: 'none',
                boxShadow: '0 0 10px rgba(0, 255, 0, 0.5)',
                zIndex: 5
              }}
            >
              {/* 선택 영역 크기 표시 */}
              <div style={{
                position: 'absolute',
                top: '-25px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: '#00ff00',
                fontSize: '12px',
                padding: '2px 6px',
                borderRadius: '3px',
                whiteSpace: 'nowrap'
              }}>
                {Math.round(Math.abs(selection.endX - selection.startX))} x {Math.round(Math.abs(selection.endY - selection.startY))}
              </div>
            </div>
          );
        })()}

        {/* 가이드 영역 하이라이트 제거 (수동 선택만 사용) */}
        
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
        
        {/* 선택 모드 인디케이터 */}
        {isSelecting && !selection && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 123, 255, 0.9)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 'bold',
            zIndex: 15
          }}>
            ✋ 영역을 드래그하여 선택하세요
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