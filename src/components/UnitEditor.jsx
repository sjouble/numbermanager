import React, { useState } from 'react';

const UnitEditor = ({ units, onSave, onCancel }) => {
  const [editingUnits, setEditingUnits] = useState([...units]);
  const [newUnit, setNewUnit] = useState('');

  const handleAddUnit = () => {
    if (newUnit.trim() && !editingUnits.includes(newUnit.trim())) {
      setEditingUnits([...editingUnits, newUnit.trim()]);
      setNewUnit('');
    }
  };

  const handleDeleteUnit = (index) => {
    const newUnits = editingUnits.filter((_, i) => i !== index);
    setEditingUnits(newUnits);
  };

  const handleSave = () => {
    onSave(editingUnits);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddUnit();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '100%',
        maxWidth: '400px',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <h3 style={{
          marginBottom: '20px',
          textAlign: 'center',
          color: '#333'
        }}>
          포장단위 편집
        </h3>

        {/* 기존 단위 목록 */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#333'
          }}>
            현재 단위 목록
          </label>
          
          {editingUnits.length === 0 ? (
            <p style={{
              color: '#666',
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '20px'
            }}>
              등록된 단위가 없습니다
            </p>
          ) : (
            <div style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              {editingUnits.map((unit, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  borderBottom: index < editingUnits.length - 1 ? '1px solid #eee' : 'none',
                  backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white'
                }}>
                  <span style={{ fontSize: '16px' }}>{unit}</span>
                  <button
                    onClick={() => handleDeleteUnit(index)}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
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

        {/* 새 단위 추가 */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#333'
          }}>
            새 단위 추가
          </label>
          
          <div style={{
            display: 'flex',
            gap: '8px'
          }}>
            <input
              type="text"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="새 단위명 입력"
              style={{
                flex: 1,
                padding: '12px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
            <button
              onClick={handleAddUnit}
              disabled={!newUnit.trim()}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 16px',
                cursor: newUnit.trim() ? 'pointer' : 'not-allowed',
                opacity: newUnit.trim() ? 1 : 0.6,
                fontSize: '16px'
              }}
            >
              추가
            </button>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={onCancel}
            className="btn btn-secondary"
            style={{ flex: 1 }}
          >
            취소
          </button>
          
          <button
            onClick={handleSave}
            className="btn btn-success"
            style={{ flex: 1 }}
          >
            저장
          </button>
        </div>

        {/* 안내 텍스트 */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#666'
        }}>
          <p style={{ margin: 0 }}>
            <strong>💡 팁:</strong> 포장단위는 품번 입력 시 드롭다운 메뉴에 표시됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnitEditor; 