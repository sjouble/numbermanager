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

    // 모바일에서 PWA 설치 가능성 확인
    const checkInstallability = () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      const isChrome = /Chrome/.test(navigator.userAgent);
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      
      console.log('설치 가능성 확인:', {
        isIOS,
        isAndroid,
        isChrome,
        isSafari,
        isSecure,
        isPWA
      });
      
      // 모바일에서 HTTPS 환경이면 설치 가능
      if ((isIOS || isAndroid) && isSecure && !isPWA) {
        setShowInstallButton(true);
        setDebugInfo('모바일 환경에서 설치 가능합니다');
        setInstallStatus('mobile-ready');
      }
    };

    // 3초 후 설치 가능성 확인
    const timer = setTimeout(() => {
      checkInstallability();
      
      if (!showInstallButton && !isPWA) {
        console.log('설치 버튼이 표시되지 않음 - 수동 옵션 제공');
        setDebugInfo('자동 설치가 불가능합니다. 수동 설치를 시도해보세요.');
        setInstallStatus('manual');
        setShowInstallButton(true); // 수동 설치 버튼 표시
      }
    }, 3000);

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
      console.log('deferredPrompt 없음 - 브라우저별 설치 방법 안내');
      
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      const isChrome = /Chrome/.test(navigator.userAgent);
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      
      if (isIOS && isSafari) {
        // iOS Safari에서 직접 설치 시도
        setDebugInfo('iOS Safari에서 설치 중...');
        setInstallStatus('ios-installing');
        
        // iOS Safari에서는 자동 설치가 불가능하므로 가이드 표시
        setTimeout(() => {
          handleManualInstall();
        }, 1000);
      } else if (isAndroid && isChrome) {
        // Android Chrome에서 설치 시도
        setDebugInfo('Android Chrome에서 설치 중...');
        setInstallStatus('android-installing');
        
        // Chrome에서 설치 팝업이 나타나지 않으면 수동 가이드
        setTimeout(() => {
          if (installStatus === 'android-installing') {
            handleManualInstall();
          }
        }, 2000);
      } else {
        // 기타 환경에서는 수동 가이드
        handleManualInstall();
      }
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
              boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)'
            }}
          >
            📱 앱 설치하기
          </button>
        </div>
      )}

      {/* 수동 설치 가이드 버튼 - 항상 표시 */}
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
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: '#6c757d',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          📋 설치 가이드 보기
        </button>
      </div>

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