import React, { useState, useEffect } from 'react';
import StartScreen from './components/StartScreen';
import CameraScreen from './components/CameraScreen';
import GalleryScreen from './components/GalleryScreen';
import ListScreen from './components/ListScreen';
import UnitEditor from './components/UnitEditor';

function App() {
  const [currentScreen, setCurrentScreen] = useState('start');
  const [capturedImage, setCapturedImage] = useState(null);
  const [itemList, setItemList] = useState([]);
  const [packagingUnits, setPackagingUnits] = useState(['카톤', '중포']);
  const [showUnitEditor, setShowUnitEditor] = useState(false);

  // 로컬 스토리지에서 데이터 로드
  useEffect(() => {
    const savedList = localStorage.getItem('itemList');
    const savedUnits = localStorage.getItem('packagingUnits');
    
    if (savedList) {
      setItemList(JSON.parse(savedList));
    }
    
    if (savedUnits) {
      setPackagingUnits(JSON.parse(savedUnits));
    }
  }, []);

  // 데이터 변경 시 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem('itemList', JSON.stringify(itemList));
  }, [itemList]);

  useEffect(() => {
    localStorage.setItem('packagingUnits', JSON.stringify(packagingUnits));
  }, [packagingUnits]);

  const handleStartCamera = () => {
    setCurrentScreen('camera');
  };

  const handleImageCaptured = (imageSrc) => {
    setCapturedImage(imageSrc);
    setCurrentScreen('gallery');
  };

  const handleAddItem = (item) => {
    setItemList([...itemList, item]);
    setCurrentScreen('list');
  };

  const handleBackToCamera = () => {
    setCapturedImage(null);
    setCurrentScreen('camera');
  };

  const handleShowList = () => {
    setCurrentScreen('list');
  };

  const handleDeleteItem = (index) => {
    const newList = itemList.filter((_, i) => i !== index);
    setItemList(newList);
  };

  const handleClearList = () => {
    setItemList([]);
  };

  const handleExportList = () => {
    if (itemList.length === 0) {
      alert('복사할 항목이 없습니다.');
      return;
    }

    const text = itemList.map(item => 
      `${item.productNumber} | ${item.quantity} | ${item.unit} | ${item.expiryDate || ''}`
    ).join('\n');
    
    // 클립보드에 복사
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert('목록이 클립보드에 복사되었습니다.');
      }).catch((error) => {
        console.error('클립보드 복사 실패:', error);
        // 폴백: 다운로드
        downloadAsFile(text);
      });
    } else {
      // 클립보드 API가 지원되지 않는 경우 다운로드
      downloadAsFile(text);
    }
  };

  const downloadAsFile = (text) => {
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `재고목록_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('목록이 파일로 다운로드되었습니다.');
    } catch (error) {
      console.error('파일 다운로드 실패:', error);
      alert('목록 복사에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleShareList = () => {
    if (itemList.length === 0) {
      alert('공유할 항목이 없습니다.');
      return;
    }

    const text = itemList.map(item => 
      `${item.productNumber} | ${item.quantity} | ${item.unit} | ${item.expiryDate || ''}`
    ).join('\n');
    
    if (navigator.share && navigator.share.canShare) {
      try {
        navigator.share({
          title: '재고 정리 목록',
          text: text,
        }).catch((error) => {
          console.error('공유 실패:', error);
          // 공유 실패 시 클립보드 복사로 폴백
          copyToClipboard(text);
        });
      } catch (error) {
        console.error('공유 API 오류:', error);
        copyToClipboard(text);
      }
    } else {
      // 공유 API가 지원되지 않는 경우 클립보드 복사
      copyToClipboard(text);
    }
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert('목록이 클립보드에 복사되었습니다.');
      }).catch((error) => {
        console.error('클립보드 복사 실패:', error);
        downloadAsFile(text);
      });
    } else {
      // 클립보드 API도 지원되지 않는 경우 다운로드
      downloadAsFile(text);
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'start':
        return <StartScreen onStart={handleStartCamera} />;
      case 'camera':
        return <CameraScreen onImageCaptured={handleImageCaptured} />;
      case 'gallery':
        return (
          <GalleryScreen 
            image={capturedImage}
            onAddItem={handleAddItem}
            onBackToCamera={handleBackToCamera}
            packagingUnits={packagingUnits}
          />
        );
      case 'list':
        return (
          <ListScreen 
            items={itemList}
            onDeleteItem={handleDeleteItem}
            onClearList={handleClearList}
            onExportList={handleExportList}
            onShareList={handleShareList}
            onAddMore={handleStartCamera}
            onEditUnits={() => setShowUnitEditor(true)}
          />
        );
      default:
        return <StartScreen onStart={handleStartCamera} />;
    }
  };

  return (
    <div className="App">
      {renderScreen()}
      {showUnitEditor && (
        <UnitEditor 
          units={packagingUnits}
          onSave={(units) => {
            setPackagingUnits(units);
            setShowUnitEditor(false);
          }}
          onCancel={() => setShowUnitEditor(false)}
        />
      )}
    </div>
  );
}

export default App; 