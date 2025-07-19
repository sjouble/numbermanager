import React from 'react';

const ListScreen = ({ 
  items, 
  onDeleteItem, 
  onClearList, 
  onExportList, 
  onShareList, 
  onAddMore,
  onEditUnits 
}) => {


  const formatExpiryDate = (expiryDate) => {
    if (!expiryDate) return '';
    if (expiryDate.length === 8) {
      return `${expiryDate.substring(0, 4)}-${expiryDate.substring(4, 6)}-${expiryDate.substring(6, 8)}`;
    }
    return expiryDate;
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f5f5f5'
    }}>
      {/* 헤더 */}
      <div style={{
        padding: '16px',
        backgroundColor: '#007bff',
        color: 'white',
        textAlign: 'center'
      }}>
        <h2>재고 정리 목록</h2>
        <p style={{ fontSize: '14px', marginTop: '4px' }}>
          총 {items.length}개 항목
        </p>
      </div>

      {/* 목록 영역 */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '16px'
      }}>
        {items.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              📦
            </div>
            <h3>목록이 비어있습니다</h3>
            <p>첫 번째 항목을 추가해보세요!</p>
          </div>
        ) : (
          <div className="card" style={{ margin: 0 }}>
            {items.map((item, index) => (
              <div key={index} className="list-item">
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px'
                  }}>
                    <strong style={{ fontSize: '16px' }}>
                      {item.productNumber}
                    </strong>
                    <span style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  
                                     <div style={{
                     fontSize: '14px',
                     color: '#666'
                   }}>
                     {item.expiryDate && (
                       <span>유통기한: {formatExpiryDate(item.expiryDate)}</span>
                     )}
                   </div>
                </div>
                
                <button
                  onClick={() => onDeleteItem(index)}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '8px 12px',
                    marginLeft: '12px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 버튼 영역 */}
      <div style={{
        padding: '16px',
        backgroundColor: 'white',
        borderTop: '1px solid #eee'
      }}>
        {items.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '12px'
          }}>
                         <button
               onClick={onExportList}
               className="btn btn-primary"
               style={{ fontSize: '14px' }}
             >
               📋 복사/다운로드
             </button>
             
             <button
               onClick={onShareList}
               className="btn btn-success"
               style={{ fontSize: '14px' }}
             >
               📤 공유/복사
             </button>
          </div>
        )}
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '12px'
        }}>
          <button
            onClick={onAddMore}
            className="btn btn-primary"
            style={{ fontSize: '14px' }}
          >
            ➕ 추가 입력
          </button>
          
          <button
            onClick={onEditUnits}
            className="btn btn-secondary"
            style={{ fontSize: '14px' }}
          >
            ⚙️ 단위 편집
          </button>
        </div>
        
        {items.length > 0 && (
          <button
            onClick={onClearList}
            className="btn btn-danger"
            style={{
              width: '100%',
              fontSize: '14px'
            }}
          >
            🗑️ 전체 삭제
          </button>
        )}
      </div>
    </div>
  );
};

export default ListScreen; 