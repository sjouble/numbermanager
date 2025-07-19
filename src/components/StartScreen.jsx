import React, { useState, useEffect } from 'react';

const StartScreen = ({ onStart }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    // PWA 설치 이벤트 리스너
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    // 앱이 이미 설치되었는지 확인
    const handleAppInstalled = () => {
      setShowInstallButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallButton(false);
      }
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
    </div>
  );
};

export default StartScreen; 