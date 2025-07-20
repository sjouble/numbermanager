import React, { useState, useEffect } from 'react';

const StartScreen = ({ onStart }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [installStatus, setInstallStatus] = useState('');

  useEffect(() => {
    // PWA 환경 확인
    const checkPWAEnvironment = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInApp = window.navigator.standalone === true;
      const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
      const isMinimal = window.matchMedia('(display-mode: minimal-ui)').matches;
      setIsPWA(isStandalone || isInApp || isFullscreen || isMinimal);
      
      console.log('PWA 환경 확인:', {
        isStandalone,
        isInApp,
        isFullscreen,
        isMinimal,
        userAgent: navigator.userAgent,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        pathname: window.location.pathname
      });
    };

    checkPWAEnvironment();

    // PWA 설치 이벤트 리스너
    const handleBeforeInstallPrompt = (e) => {
      console.log('beforeinstallprompt 이벤트 발생:', e);
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
      setDebugInfo('설치 가능: beforeinstallprompt 이벤트 수신됨');
      setInstallStatus('ready');
    };

    // 앱이 이미 설치되었는지 확인
    const handleAppInstalled = () => {
      console.log('앱 설치됨');
      setDebugInfo('앱이 설치되었습니다. 재설치도 가능합니다.');
      setInstallStatus('installed');
    };

    // 매니페스트 확인
    const checkManifest = async () => {
      try {
        const response = await fetch('/manifest.json');
        if (response.ok) {
          const manifest = await response.json();
          console.log('매니페스트 로드 성공:', manifest);
          
          // 매니페스트 유효성 검사
          const requiredFields = ['name', 'short_name', 'start_url', 'display'];
          const missingFields = requiredFields.filter(field => !manifest[field]);
          
          if (missingFields.length > 0) {
            setDebugInfo(`매니페스트 누락 필드: ${missingFields.join(', ')}`);
          } else {
            setDebugInfo('매니페스트 로드 성공 - 설치 준비 완료');
          }
        } else {
          console.error('매니페스트 로드 실패:', response.status);
          setDebugInfo(`매니페스트 로드 실패: ${response.status}`);
        }
      } catch (error) {
        console.error('매니페스트 확인 오류:', error);
        setDebugInfo('매니페스트 확인 오류');
      }
    };

    checkManifest();

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 디버깅: 5초 후에도 설치 버튼이 안 보이면 수동 옵션 제공
    const timer = setTimeout(() => {
      if (!showInstallButton && !isPWA) {
        console.log('설치 버튼이 표시되지 않음 - 수동 옵션 제공');
        setDebugInfo('자동 설치가 불가능합니다. 수동 설치를 시도해보세요.');
        setInstallStatus('manual');
      }
    }, 5000);

    // 항상 설치 버튼 표시 (PWA 환경에서도 재설치 가능하도록)
    setShowInstallButton(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, [showInstallButton, isPWA]);

  const handleInstallApp = async () => {
    console.log('설치 버튼 클릭됨');
    
    if (deferredPrompt) {
      try {
        console.log('deferredPrompt 사용하여 설치 시작');
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('설치 결과:', outcome);
        
        if (outcome === 'accepted') {
          setDebugInfo('앱 설치가 시작되었습니다');
          setInstallStatus('installing');
        } else {
          setDebugInfo('설치가 취소되었습니다');
          setInstallStatus('cancelled');
        }
      } catch (error) {
        console.error('설치 오류:', error);
        setDebugInfo('설치 중 오류가 발생했습니다');
        setInstallStatus('error');
      }
    } else {
      console.log('deferredPrompt 없음 - 수동 설치 가이드 표시');
      // deferredPrompt가 없는 경우 수동 설치 가이드 표시
      handleManualInstall();
    }
  };

  const handleManualInstall = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    let message = '';
    
    if (isIOS && isSafari) {
      message = 'iOS Safari에서 설치하려면:\n\n1. Safari 브라우저에서 열기\n2. 하단 공유 버튼(□) 클릭\n3. "홈 화면에 추가" 선택\n4. "추가" 버튼 클릭\n\n설치 후 홈 화면에서 앱 아이콘을 터치하면 전체화면 모드로 실행됩니다.';
    } else if (isAndroid && isChrome) {
      message = 'Android Chrome에서 설치하려면:\n\n1. Chrome 브라우저에서 열기\n2. 주소창 옆 메뉴(⋮) 클릭\n3. "홈 화면에 추가" 선택\n4. "추가" 버튼 클릭\n\n설치 후 홈 화면에서 앱 아이콘을 터치하면 전체화면 모드로 실행됩니다.';
    } else if (isAndroid) {
      message = 'Android에서 설치하려면:\n\n1. Chrome 브라우저에서 열기\n2. 주소창 옆 메뉴(⋮) 클릭\n3. "홈 화면에 추가" 선택\n4. "추가" 버튼 클릭\n\n설치 후 홈 화면에서 앱 아이콘을 터치하면 전체화면 모드로 실행됩니다.';
    } else {
      message = '데스크톱에서 설치하려면:\n\n1. Chrome/Edge 브라우저에서 열기\n2. 주소창 옆의 설치 아이콘(📱) 클릭\n3. "설치" 버튼 클릭\n\n또는 F12 → Application → Manifest에서 설치할 수 있습니다.';
    }
    
    alert(message);
  };

  const requestFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
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
      {debugInfo && (
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
          {debugInfo}
          {installStatus && ` (${installStatus})`}
        </div>
      )}

      {/* 앱 설치 버튼 */}
      {showInstallButton && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          right: '20px'
        }}>
          <button
            onClick={handleInstallApp}
            className="btn btn-success"
            style={{
              width: '100%',
              fontSize: '16px',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            📱 앱 설치하기
          </button>
        </div>
      )}

      {/* 수동 설치 옵션 - PWA 환경이 아닌 경우에만 표시 */}
      {!isPWA && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          left: '20px',
          right: '20px'
        }}>
          <button
            onClick={handleManualInstall}
            className="btn btn-secondary"
            style={{
              width: '100%',
              fontSize: '14px',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            📱 수동 설치 가이드
          </button>
        </div>
      )}

      {/* 전체화면 모드 버튼 */}
      {!isPWA && (
        <div style={{
          position: 'absolute',
          bottom: '140px',
          left: '20px',
          right: '20px'
        }}>
          <button
            onClick={requestFullscreen}
            className="btn btn-primary"
            style={{
              width: '100%',
              fontSize: '14px',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            🖥️ 전체화면 모드
          </button>
        </div>
      )}
    </div>
  );
};

export default StartScreen; 