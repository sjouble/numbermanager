import React, { useState, useRef, useEffect } from 'react';

const GalleryScreen = ({ image, onAddItem, onBackToCamera, packagingUnits }) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
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
  const isDraggingRef = useRef(false);
  const startPointRef = useRef(null);

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
        setIsSelecting(true); // 이미지 로드 완료 후 선택 모드 활성화
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

  // 전역 마우스 이벤트 리스너
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (isDraggingRef.current) {
        handleMouseMove(e);
      }
    };

    const handleGlobalMouseUp = (e) => {
      if (isDraggingRef.current) {
        handleMouseUp(e);
      }
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // 좌표 변환 함수
  const getCanvasCoordinates = (clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const canvas = canvasRef.current;
    
    if (!rect || !canvas) {
      console.log('캔버스 정보를 가져올 수 없음');
      return null;
    }
    
    // 화면 좌표를 캔버스 좌표로 변환
    let x = (clientX - rect.left);
    let y = (clientY - rect.top);
    
    // 캔버스 크기에 맞게 정규화
    x = (x / rect.width) * canvas.width;
    y = (y / rect.height) * canvas.height;
    
    // 경계 제한
    x = Math.max(0, Math.min(x, canvas.width));
    y = Math.max(0, Math.min(y, canvas.height));
    
    return { x, y };
  };

  // 마우스 다운 이벤트
  const handleMouseDown = (e) => {
    console.log('마우스 다운:', { isSelecting });
    
    if (!isSelecting) return;
    
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;
    
    console.log('시작 좌표:', coords);
    
    isDraggingRef.current = true;
    startPointRef.current = coords;
    
    setSelection({
      startX: coords.x,
      startY: coords.y,
      endX: coords.x,
      endY: coords.y
    });
  };

  // 마우스 이동 이벤트
  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || !startPointRef.current) return;
    
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;
    
    console.log('드래그 중:', coords);
    
    setSelection({
      startX: startPointRef.current.x,
      startY: startPointRef.current.y,
      endX: coords.x,
      endY: coords.y
    });
  };

  // 마우스 업 이벤트
  const handleMouseUp = async (e) => {
    console.log('마우스 업:', { isDragging: isDraggingRef.current, selection });
    
    if (isDraggingRef.current && selection) {
      isDraggingRef.current = false;
      startPointRef.current = null;
      
      // 최소 크기 확인
      const width = Math.abs(selection.endX - selection.startX);
      const height = Math.abs(selection.endY - selection.startY);
      
      if (width < 10 || height < 10) {
        console.log('선택 영역이 너무 작음');
        setSelection(null);
        return;
      }
      
      console.log('선택 완료:', selection);
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
      
      // 선택 영역을 새로운 캔버스에 복사 (고해상도)
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = finalWidth * 2;
      tempCanvas.height = finalHeight * 2;
      const tempCtx = tempCanvas.getContext('2d');
      
      // 이미지 스무딩 비활성화로 선명도 향상
      tempCtx.imageSmoothingEnabled = false;
      
      // 선택 영역을 고해상도로 복사
      tempCtx.drawImage(
        canvas,
        startX, startY, finalWidth, finalHeight,
        0, 0, finalWidth * 2, finalHeight * 2
      );
      
      // 이미지를 Base64로 변환
      const imageDataUrl = tempCanvas.toDataURL('image/png', 0.9);
      
      // PaddleOCR API 호출
      const response = await fetch('https://api.paddleocr.com/v1/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageDataUrl.split(',')[1], // Base64 데이터 부분만 추출
          lang: 'korean',
          use_angle_cls: true,
          use_gpu: false
        })
      });
      
      if (!response.ok) {
        throw new Error(`PaddleOCR API 오류: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('PaddleOCR 결과:', result);
      
      // 텍스트 추출 및 정제
      let allText = '';
      if (result.data && result.data.length > 0) {
        allText = result.data.map(item => item.text).join(' ');
      }
      
      console.log('PaddleOCR 원본 텍스트:', allText);
      
      // 텍스트 정제 및 숫자 추출
      let cleanedText = allText.replace(/[^\w가-힣]/g, ''); // 특수문자 제거
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
      
      setRecognizedText(allText);
      setFormData(prev => ({
        ...prev,
        productNumber: recognizedNumber
      }));
      
    } catch (error) {
      console.error('PaddleOCR 오류:', error);
      
      // PaddleOCR API가 실패한 경우 대체 OCR 서비스 시도
      try {
        console.log('대체 OCR 서비스 시도...');
        const fallbackResult = await performFallbackOCR();
        setRecognizedText(fallbackResult);
        setFormData(prev => ({
          ...prev,
          productNumber: fallbackResult
        }));
      } catch (fallbackError) {
        console.error('대체 OCR도 실패:', fallbackError);
        alert('텍스트 인식에 실패했습니다. 다시 시도해주세요.');
      }
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


  // 대체 OCR 함수 (PaddleOCR 실패 시 사용)
  const performFallbackOCR = async () => {
    try {
      const canvas = canvasRef.current;
      
      // 선택 영역 계산
      const startX = Math.max(0, Math.min(selection.startX, selection.endX));
      const startY = Math.max(0, Math.min(selection.startY, selection.endY));
      const endX = Math.min(canvas.width, Math.max(selection.startX, selection.endX));
      const endY = Math.min(canvas.height, Math.max(selection.startY, selection.endY));
      const width = endX - startX;
      const height = endY - startY;
      
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
      
      // 이미지를 Base64로 변환
      const imageDataUrl = tempCanvas.toDataURL('image/png', 0.9);
      
      // Google Cloud Vision API 또는 다른 대체 서비스 사용
      // 여기서는 간단한 텍스트 추출 시뮬레이션
      console.log('대체 OCR 서비스 실행 중...');
      
      // 실제로는 다른 OCR API를 호출하거나
      // 사용자에게 수동 입력을 요청할 수 있습니다
      return '수동입력필요';
      
    } catch (error) {
      console.error('대체 OCR 오류:', error);
      throw error;
    }
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
              isDraggingRef.current = false;
              startPointRef.current = null;
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
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              cursor: isSelecting ? 'crosshair' : 'pointer',
              border: '1px solid #ccc',
              backgroundColor: '#f0f0f0',
              userSelect: 'none'
            }}
          />
          
          {/* 선택 영역 표시 */}
          {selection && (() => {
            const rect = canvasRef.current?.getBoundingClientRect();
            const canvas = canvasRef.current;
            if (!rect || !canvas) return null;

            const canvasX = canvas.offsetLeft;
            const canvasY = canvas.offsetTop;
            
            // 캔버스 좌표를 화면 좌표로 변환
            const displayX = Math.min(selection.startX, selection.endX) * (rect.width / canvas.width);
            const displayY = Math.min(selection.startY, selection.endY) * (rect.height / canvas.height);
            const displayWidth = Math.abs(selection.endX - selection.startX) * (rect.width / canvas.width);
            const displayHeight = Math.abs(selection.endY - selection.startY) * (rect.height / canvas.height);
            
            return (
              <div
                style={{
                  position: 'absolute',
                  left: canvasX + displayX,
                  top: canvasY + displayY,
                  width: displayWidth,
                  height: displayHeight,
                  border: '3px solid #00ff00',
                  backgroundColor: 'rgba(0, 255, 0, 0.3)',
                  pointerEvents: 'none',
                  boxShadow: '0 0 10px rgba(0, 255, 0, 0.5)',
                  zIndex: 10
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
                  {Math.round(displayWidth)} x {Math.round(displayHeight)}
                </div>
              </div>
            );
          })()}
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

        {/* 디버그 정보 */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 20
        }}>
          선택모드: {isSelecting ? 'ON' : 'OFF'}<br/>
          드래그: {isDraggingRef.current ? 'ON' : 'OFF'}<br/>
          선택영역: {selection ? '있음' : '없음'}
        </div>

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