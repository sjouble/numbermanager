import React, { useState, useEffect } from 'react';

const StartScreen = ({ onStart }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [installStatus, setInstallStatus] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    console.log('StartScreen 초기화 시작');
    
    // PWA 환경 확인
    const checkPWAEnvironment = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInApp = window.navigator.standalone === true;
      const isFullscreenMode = window.matchMedia('(display-mode: fullscreen)').matches;
      const isMinimal = window.matchMedia('(display-mode: minimal-ui)').matches;
      
      const pwaMode = isStandalone || isInApp || isFullscreenMode || isMinimal;
      setIsPWA(pwaMode);
      
      console.log('PWA 환경 확인:', {
        isStandalone,
        isInApp,
        isFullscreenMode,
        isMinimal,
        pwaMode,
        userAgent: navigator.userAgent,
        protocol: window.location.protocol,
        hostname: window.location.hostname
      });
    };

    // 전체화면 상태 확인
    const checkFullscreenStatus = () => {
      const fullscreenElement = document.fullscreenElement || 
                               document.webkitFullscreenElement || 
                               document.mozFullScreenElement || 
                               document.msFullscreenElement;
      setIsFullscreen(!!fullscreenElement);
    };

    // 매니페스트 확인
    const checkManifest = async () => {
      try {
        const response = await fetch('/manifest.json');
        if (response.ok) {
          const manifest = await response.json();
          console.log('매니페스트 로드 성공:', manifest);
          
          // 필수 필드 확인
          const requiredFields = ['name', 'short_name', 'start_url', 'display'];
          const missingFields = requiredFields.filter(field => !manifest[field]);
          
          if (missingFields.length > 0) {
            setDebugInfo(`매니페스트 누락: ${missingFields.join(', ')}`);
            setInstallStatus('manifest-error');
          } else {
            setDebugInfo('매니페스트 정상');
            setInstallStatus('manifest-ok');
          }
        } else {
          console.error('매니페스트 로드 실패:', response.status);
          setDebugInfo(`매니페스트 로드 실패: ${response.status}`);
          setInstallStatus('manifest-error');
        }
      } catch (error) {
        console.error('매니페스트 확인 오류:', error);
        setDebugInfo('매니페스트 확인 오류');
        setInstallStatus('manifest-error');
      }
    };

    // PWA 설치 이벤트 리스너
    const handleBeforeInstallPrompt = (e) => {
      console.log('beforeinstallprompt 이벤트 발생');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
      setDebugInfo('설치 가능: beforeinstallprompt 수신');
      setInstallStatus('ready');
    };

    // 앱 설치 완료 이벤트
    const handleAppInstalled = () => {
      console.log('앱 설치 완료');
      setDebugInfo('앱이 설치되었습니다');
      setInstallStatus('installed');
    };

    // 전체화면 변경 이벤트
    const handleFullscreenChange = () => {
      checkFullscreenStatus();
    };

    // 초기화 실행
    checkPWAEnvironment();
    checkFullscreenStatus();
    checkManifest();

    // 이벤트 리스너 등록
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // 모바일 환경에서 설치 가능성 확인 (3초 후)
    const timer = setTimeout(() => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      
      if ((isIOS || isAndroid) && isSecure && !isPWA && !showInstallButton) {
        setShowInstallButton(true);
        setDebugInfo('모바일 환경에서 설치 가능');
        setInstallStatus('mobile-ready');
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallApp = async () => {
    console.log('앱 설치 버튼 클릭');
    
    if (deferredPrompt) {
      try {
        console.log('deferredPrompt로 설치 시작');
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('설치 결과:', outcome);
        
        if (outcome === 'accepted') {
          setDebugInfo('앱 설치 시작됨');
          setInstallStatus('installing');
        } else {
          setDebugInfo('설치 취소됨');
          setInstallStatus('cancelled');
        }
      } catch (error) {
        console.error('설치 오류:', error);
        setDebugInfo('설치 오류 발생');
        setInstallStatus('error');
      }
    } else {
      console.log('deferredPrompt 없음 - 수동 설치 가이드');
      handleManualInstall();
    }
  };

  const handleManualInstall = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isEdge = /Edg/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    
    let message = '';
    let title = '앱 설치 방법';
    
    if (isIOS && isSafari) {
      title = '📱 iOS Safari 설치 방법';
      message = `1️⃣ Safari 브라우저에서 열기 (현재 브라우저)
2️⃣ 하단 공유 버튼(□) 클릭
3️⃣ "홈 화면에 추가" 선택
4️⃣ "추가" 버튼 클릭

✅ 설치 완료 후:
• 홈 화면에서 앱 아이콘 터치
• 전체화면 모드로 실행됨
• 브라우저 주소창 숨겨짐`;
    } else if (isAndroid && isChrome) {
      title = '📱 Android Chrome 설치 방법';
      message = `1️⃣ Chrome 브라우저에서 열기 (현재 브라우저)
2️⃣ 주소창 옆 메뉴(⋮) 클릭
3️⃣ "홈 화면에 추가" 선택
4️⃣ "추가" 버튼 클릭

✅ 설치 완료 후:
• 홈 화면에서 앱 아이콘 터치
• 전체화면 모드로 실행됨
• 브라우저 UI 숨겨짐`;
    } else if (isAndroid) {
      title = '📱 Android 설치 방법';
      message = `1️⃣ Chrome 브라우저에서 열기
2️⃣ 주소창 옆 메뉴(⋮) 클릭
3️⃣ "홈 화면에 추가" 선택
4️⃣ "추가" 버튼 클릭

✅ 설치 완료 후:
• 홈 화면에서 앱 아이콘 터치
• 전체화면 모드로 실행됨`;
    } else if (isChrome || isEdge) {
      title = '💻 데스크톱 설치 방법';
      message = `1️⃣ 주소창 옆의 설치 아이콘(📱) 클릭
2️⃣ "설치" 버튼 클릭

또는:
• F12 → Application → Manifest → Install

✅ 설치 완료 후:
• 데스크톱에서 앱 아이콘 클릭
• 독립 창으로 실행됨`;
    } else if (isFirefox) {
      title = '🌐 Firefox 설치 방법';
      message = `Firefox에서는 PWA 설치가 제한적입니다.

대안:
1️⃣ Chrome 또는 Edge 브라우저 사용
2️⃣ 위의 설치 방법 따라하기

또는:
• Firefox 주소창 옆 메뉴(⋮) 확인
• "앱 설치" 옵션이 있는지 확인`;
    } else {
      title = '📱 일반 설치 방법';
      message = `현재 브라우저: ${navigator.userAgent}

권장 방법:
1️⃣ Chrome 또는 Edge 브라우저 사용
2️⃣ 위의 설치 방법 따라하기

또는:
• 브라우저 주소창 옆 메뉴 확인
• "홈 화면에 추가" 또는 "앱 설치" 옵션 찾기`;
    }
    
    // 더 나은 UI로 표시
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      backgroundColor: rgba(0,0,0,0.8);
      display: flex;
      justifyContent: center;
      alignItems: center;
      zIndex: 10000;
      padding: 20px;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      backgroundColor: white;
      borderRadius: 12px;
      padding: 24px;
      maxWidth: 400px;
      width: 100%;
      maxHeight: 80vh;
      overflow-y: auto;
      boxShadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    
    content.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: #333; font-size: 18px;">${title}</h3>
      <div style="white-space: pre-line; line-height: 1.6; color: #666; font-size: 14px;">${message}</div>
      <button onclick="this.parentElement.parentElement.remove()" style="
        margin-top: 20px;
        width: 100%;
        padding: 12px;
        backgroundColor: #007bff;
        color: white;
        border: none;
        borderRadius: 6px;
        fontSize: 16px;
        cursor: pointer;
      ">확인</button>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // 배경 클릭으로 닫기
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  };

  const requestFullscreen = () => {
    console.log('전체화면 요청');
    
    try {
      const element = document.documentElement;
      
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
      } else {
        console.log('전체화면 지원 안됨');
        setDebugInfo('전체화면 지원 안됨');
        alert('이 브라우저에서는 전체화면을 지원하지 않습니다.');
      }
    } catch (error) {
      console.error('전체화면 요청 오류:', error);
      setDebugInfo('전체화면 오류');
      alert('전체화면 모드로 전환할 수 없습니다.');
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      position: 'relative'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h1 style={{
          fontSize: '28px',
          marginBottom: '16px',
          color: '#333',
          fontWeight: 'bold'
        }}>
          품번 인식 재고 정리
        </h1>
        
        <p style={{
          fontSize: '16px',
          marginBottom: '32px',
          color: '#666',
          lineHeight: '1.5'
        }}>
          카메라로 제품을 촬영하고 품번을 자동으로 인식하여<br />
          재고 정리 목록을 관리하세요.
        </p>
        
        <button 
          onClick={onStart}
          className="btn btn-primary"
          style={{
            width: '100%',
            fontSize: '18px',
            padding: '16px 24px',
            marginBottom: '16px'
          }}
        >
          과출정리 시작
        </button>
        
        <div style={{
          fontSize: '14px',
          color: '#888',
          marginTop: '24px',
          padding: '16px',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #eee'
        }}>
          <h3 style={{ marginBottom: '8px', color: '#333' }}>사용 방법:</h3>
          <ol style={{ textAlign: 'left', paddingLeft: '20px' }}>
            <li>제품을 카메라로 촬영합니다</li>
            <li>품번 영역을 터치하여 선택합니다</li>
            <li>수량과 단위를 입력합니다</li>
            <li>목록에 추가하고 저장합니다</li>
          </ol>
        </div>
      </div>

      {/* 디버그 정보 */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        right: '10px',
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 100
      }}>
        <div>매니페스트: {installStatus}</div>
        <div>PWA 모드: {isPWA ? 'ON' : 'OFF'}</div>
        <div>전체화면: {isFullscreen ? 'ON' : 'OFF'}</div>
        <div>설치버튼: {showInstallButton ? 'ON' : 'OFF'}</div>
        {debugInfo && <div>상태: {debugInfo}</div>}
      </div>

      {/* 버튼 컨테이너 */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* 전체화면 모드 버튼 */}
        {!isPWA && (
          <button
            onClick={requestFullscreen}
            style={{
              width: '100%',
              fontSize: '14px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: '#007bff',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🖥️ {isFullscreen ? '전체화면 해제' : '전체화면 모드'}
          </button>
        )}

        {/* 수동 설치 가이드 버튼 */}
        <button
          onClick={handleManualInstall}
          style={{
            width: '100%',
            fontSize: '14px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: '#6c757d',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          📋 설치 가이드 보기
        </button>

        {/* 앱 설치 버튼 */}
        {showInstallButton && (
          <button
            onClick={handleInstallApp}
            style={{
              width: '100%',
              fontSize: '16px',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: '#28a745',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)',
              cursor: 'pointer'
            }}
          >
            📱 앱 설치하기
          </button>
        )}
      </div>
    </div>
  );
};

export default StartScreen; 