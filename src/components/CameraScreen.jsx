import React, { useState, useRef, useCallback, useEffect } from 'react';

const CameraScreen = ({ onImageCaptured }) => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const videoConstraints = {
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    facingMode: "environment"
  };

  // 컴포넌트 마운트 시 카메라 권한 확인
  useEffect(() => {
    checkCameraPermission();
    return () => {
      // 컴포넌트 언마운트 시 카메라 정리
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const checkCameraPermission = async () => {
    try {
      // HTTPS 환경 확인
      const isSecure = window.location.protocol === 'https:';
      if (!isSecure) {
        setCameraError('카메라 기능은 HTTPS 환경에서만 사용할 수 있습니다.');
        setIsLoading(false);
        return;
      }

      // 카메라 지원 여부 확인
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('이 브라우저는 카메라를 지원하지 않습니다.');
        setIsLoading(false);
        return;
      }

      // 카메라 권한 상태 확인 (선택적)
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' });
          if (permission.state === 'granted') {
            // 권한이 이미 허용된 경우 카메라 초기화
            await initializeCamera();
          } else if (permission.state === 'denied') {
            setCameraError('카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.');
            setIsLoading(false);
          } else {
            // 권한이 아직 요청되지 않은 상태
            setIsLoading(false);
            setHasPermission(false);
          }
        } catch (permissionError) {
          console.log('Permissions API 오류, 직접 카메라 요청 시도:', permissionError);
          setIsLoading(false);
          setHasPermission(false);
        }
      } else {
        // Permissions API가 지원되지 않는 경우
        console.log('Permissions API 미지원, 직접 카메라 요청 시도');
        setIsLoading(false);
        setHasPermission(false);
      }
    } catch (error) {
      console.error('권한 확인 오류:', error);
      setCameraError('카메라 권한을 확인할 수 없습니다.');
      setIsLoading(false);
    }
  };

  const initializeCamera = async () => {
    try {
      setIsLoading(true);
      setCameraError(null);

      // 더 간단한 비디오 제약 조건으로 시작
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment"
        }
      };

      // 먼저 기본 설정으로 시도
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (basicError) {
        console.log('기본 설정 실패, 더 간단한 설정으로 재시도:', basicError);
        // 더 간단한 설정으로 재시도
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // 비디오 로드 완료 대기
        videoRef.current.onloadedmetadata = () => {
          console.log('카메라 스트림 시작됨');
          setHasPermission(true);
          setIsLoading(false);
        };

        // 비디오 로드 오류 처리
        videoRef.current.onerror = (error) => {
          console.error('비디오 로드 오류:', error);
          setCameraError('비디오 스트림을 로드할 수 없습니다.');
          setIsLoading(false);
          setHasPermission(false);
        };
      }
    } catch (error) {
      console.error('카메라 초기화 오류:', error);
      setIsLoading(false);
      setHasPermission(false);
      
      let errorMessage = '카메라에 접근할 수 없습니다.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = '카메라 권한이 거부되었습니다. 브라우저 설정에서 카메라 권한을 허용해주세요.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = '카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = '이 브라우저는 카메라를 지원하지 않습니다.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'HTTPS 환경에서만 카메라를 사용할 수 있습니다.';
      } else if (error.name === 'AbortError') {
        errorMessage = '카메라 접근이 중단되었습니다. 다시 시도해주세요.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = '카메라가 다른 앱에서 사용 중입니다. 다른 앱을 종료하고 다시 시도해주세요.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = '요청한 카메라 설정을 지원하지 않습니다.';
      } else if (error.name === 'TypeError') {
        errorMessage = '카메라 설정에 문제가 있습니다.';
      }
      
      setCameraError(errorMessage);
    }
  };

  const capture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // 캔버스 크기를 비디오 크기에 맞춤
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      console.log('촬영된 이미지 크기:', video.videoWidth, 'x', video.videoHeight);

      // 비디오 프레임을 캔버스에 그리기
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 캔버스를 이미지로 변환
      const imageSrc = canvas.toDataURL('image/jpeg', 0.8);
      console.log('이미지 캡처 완료, 데이터 URL 길이:', imageSrc.length);
      
      setCapturedImage(imageSrc);
      setIsCameraActive(false);
    } else {
      console.error('비디오 또는 캔버스 참조가 없습니다');
    }
  }, []);

  const retake = () => {
    setCapturedImage(null);
    setIsCameraActive(true);
  };

  const confirmImage = () => {
    if (capturedImage) {
      onImageCaptured(capturedImage);
    }
  };

  const requestCameraPermission = async () => {
    try {
      setIsLoading(true);
      setCameraError(null);
      
      // HTTPS 환경 확인
      const isSecure = window.location.protocol === 'https:';
      if (!isSecure) {
        setCameraError('카메라 기능은 HTTPS 환경에서만 사용할 수 있습니다.');
        setIsLoading(false);
        return;
      }

      // 카메라 지원 여부 재확인
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('이 브라우저는 카메라를 지원하지 않습니다.');
        setIsLoading(false);
        return;
      }

      // 카메라 권한 요청
      await initializeCamera();
    } catch (error) {
      console.error('카메라 권한 요청 오류:', error);
      setCameraError('카메라 권한 요청에 실패했습니다. 다시 시도해주세요.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fullscreen">
      {isCameraActive ? (
        <div className="camera-container">
          {isLoading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#000',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: 'white',
              zIndex: 10
            }}>
              <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                <p>카메라를 초기화하고 있습니다...</p>
              </div>
            </div>
          )}
          
          {cameraError && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#000',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: 'white',
              zIndex: 10,
              padding: '20px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                  ⚠️
                </div>
                <h3 style={{ marginBottom: '12px', fontSize: '18px' }}>
                  카메라 접근 오류
                </h3>
                <p style={{ marginBottom: '20px', fontSize: '14px', opacity: 0.8 }}>
                  {cameraError}
                </p>
                <button
                  onClick={requestCameraPermission}
                  className="btn btn-primary"
                  style={{ marginBottom: '12px' }}
                  disabled={isLoading}
                >
                  {isLoading ? '권한 요청 중...' : '다시 시도하기'}
                </button>
                <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '16px', textAlign: 'left' }}>
                  <p style={{ marginBottom: '8px' }}><strong>해결 방법:</strong></p>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li>브라우저 주소창의 카메라 아이콘 클릭</li>
                    <li>브라우저 설정에서 카메라 권한 허용</li>
                    <li>다른 카메라 앱 종료 후 재시도</li>
                    <li>개발 환경에서는 테스트 이미지 사용</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    // 테스트용 더미 이미지 생성
                    const canvas = document.createElement('canvas');
                    canvas.width = 800;
                    canvas.height = 600;
                    const ctx = canvas.getContext('2d');
                    
                    // 배경
                    ctx.fillStyle = '#f8f9fa';
                    ctx.fillRect(0, 0, 800, 600);
                    
                    // 제품 박스 그리기
                    ctx.fillStyle = '#e9ecef';
                    ctx.fillRect(100, 150, 600, 300);
                    ctx.strokeStyle = '#6c757d';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(100, 150, 600, 300);
                    
                    // 품번 영역 (선택 가능한 영역) - 더 명확하게 표시
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(150, 200, 200, 50);
                    ctx.strokeStyle = '#007bff';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(150, 200, 200, 50);
                    
                    // 품번 영역 내부에 점선 추가
                    ctx.setLineDash([5, 5]);
                    ctx.strokeStyle = '#007bff';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(155, 205, 190, 40);
                    ctx.setLineDash([]);
                    
                    // 텍스트
                    ctx.fillStyle = '#333';
                    ctx.font = 'bold 32px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('제품 테스트 이미지', 400, 120);
                    
                    ctx.font = 'bold 24px Arial';
                    ctx.fillText('품번: 12345678', 250, 235);
                    
                    ctx.font = '20px Arial';
                    ctx.fillText('수량: 5개', 400, 280);
                    ctx.fillText('단위: 카톤', 400, 310);
                    ctx.fillText('유통기한: 20251201', 400, 340);
                    
                    // 안내 텍스트
                    ctx.fillStyle = '#6c757d';
                    ctx.font = '16px Arial';
                    ctx.fillText('위의 파란색 박스 영역을 선택하여 품번을 인식해보세요', 400, 500);
                    
                    // 화살표 추가
                    ctx.fillStyle = '#007bff';
                    ctx.font = '24px Arial';
                    ctx.fillText('↓', 250, 190);
                    
                    const testImage = canvas.toDataURL('image/jpeg', 0.9);
                    onImageCaptured(testImage);
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '14px' }}
                >
                  테스트 이미지로 진행
                </button>
              </div>
            </div>
          )}
          
          {!hasPermission && !cameraError && !isLoading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#000',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: 'white',
              zIndex: 10,
              padding: '20px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                  📷
                </div>
                <h3 style={{ marginBottom: '12px', fontSize: '20px' }}>
                  카메라 권한이 필요합니다
                </h3>
                <p style={{ marginBottom: '20px', fontSize: '14px', opacity: 0.8 }}>
                  제품을 촬영하기 위해 카메라 접근 권한이 필요합니다.
                </p>
                <button
                  onClick={requestCameraPermission}
                  className="btn btn-primary"
                  disabled={isLoading}
                  style={{ marginBottom: '12px' }}
                >
                  {isLoading ? '권한 요청 중...' : '카메라 시작하기'}
                </button>
                <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '12px' }}>
                  <p style={{ marginBottom: '4px' }}>💡 팁:</p>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px' }}>
                    <li>브라우저에서 권한 요청 팝업이 나타날 수 있습니다</li>
                    <li>팝업이 차단된 경우 주소창의 카메라 아이콘을 확인하세요</li>
                    <li>개발 환경에서는 테스트 이미지로 모든 기능을 확인할 수 있습니다</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: hasPermission && !cameraError ? 'block' : 'none'
            }}
          />
          
          {/* 숨겨진 캔버스 */}
          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
          />
          
          {/* 카메라 컨트롤 */}
          {hasPermission && !cameraError && !isLoading && (
            <div style={{
              position: 'absolute',
              bottom: '40px',
              left: '0',
              right: '0',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '20px'
            }}>
              <button
                onClick={capture}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  border: '4px solid white',
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: 'white'
                }} />
              </button>
            </div>
          )}

          {/* 안내 텍스트 */}
          {hasPermission && !cameraError && !isLoading && (
            <div style={{
              position: 'absolute',
              top: '40px',
              left: '0',
              right: '0',
              textAlign: 'center',
              color: 'white',
              fontSize: '18px',
              fontWeight: 'bold',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
            }}>
              제품을 촬영하세요
            </div>
          )}

          {/* 가이드 라인 */}
          {hasPermission && !cameraError && !isLoading && (
            <div style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '200px',
              height: '80px',
              border: '3px solid #00ff00',
              borderRadius: '8px',
              pointerEvents: 'none',
              zIndex: 10,
              boxShadow: '0 0 10px rgba(0, 255, 0, 0.5)'
            }}>
              <div style={{
                position: 'absolute',
                top: '-30px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#00ff00',
                fontSize: '14px',
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding: '4px 8px',
                borderRadius: '4px',
                whiteSpace: 'nowrap'
              }}>
                품번 영역
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          backgroundColor: '#000'
        }}>
          <img
            src={capturedImage}
            alt="촬영된 이미지"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
          
          {/* 이미지 확인 컨트롤 */}
          <div style={{
            position: 'absolute',
            bottom: '40px',
            left: '0',
            right: '0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '20px'
          }}>
            <button
              onClick={retake}
              className="btn btn-secondary"
              style={{
                minWidth: '120px'
              }}
            >
              다시 촬영
            </button>
            
            <button
              onClick={confirmImage}
              className="btn btn-success"
              style={{
                minWidth: '120px'
              }}
            >
              확인
            </button>
          </div>

          {/* 안내 텍스트 */}
          <div style={{
            position: 'absolute',
            top: '40px',
            left: '0',
            right: '0',
            textAlign: 'center',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
          }}>
            촬영된 이미지를 확인하세요
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraScreen; 