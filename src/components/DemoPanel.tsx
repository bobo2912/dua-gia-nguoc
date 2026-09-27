import { useState } from 'react';
import { ROOMS } from '../config';
import { store } from '../engine/game';
import { useGame, useNav } from '../nav';
import { Sheet } from './common';

/** Công cụ dành cho người thử nghiệm, không có trong app thật */
export function DemoPanel({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const nav = useNav();
  const p = g.state.profile;
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <Sheet onClose={onClose} label="Công cụ demo">
      <div className="display" style={{ fontSize: 24, fontWeight: 800 }}>
        Công cụ demo
      </div>
      <div className="small muted" style={{ lineHeight: 1.5 }}>
        Bảng này chỉ có trong bản thử nghiệm. Các thợ săn khác trong phòng là thợ săn ảo do máy mô phỏng. Thời lượng phòng đã được rút ngắn (xem file <code>src/config.ts</code>).
      </div>

      <div className="col" style={{ gap: 8 }}>
        <b>Tua nhanh đến sát 60 giây cuối</b>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {ROOMS.map((r) => (
            <button
              key={r.id}
              className="btn outline sm"
              onClick={() => {
                store.demoFastForward(r.id);
                nav.toast(`Đã tua Tổ ${r.name}`);
              }}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        <button className="btn outline sm" onClick={() => store.demoAddDrops(10)}>
          +10 giọt mật
        </button>
        <button className="btn outline sm" onClick={() => store.demoAddLoyalty(1000)}>
          +1.000 điểm Loyalty
        </button>
        <button className={`btn sm ${p.demoGolden ? '' : 'outline'}`} onClick={() => store.demoToggleGolden()}>
          Giờ vàng: {p.demoGolden ? 'Bật' : 'Theo giờ thật'}
        </button>
        <button
          className="btn outline sm"
          onClick={() => {
            onClose();
            store.demoBreakReminder();
          }}
        >
          Xem nhắc nghỉ
        </button>
      </div>

      {confirmReset ? (
        <div className="col" style={{ gap: 8 }}>
          <b className="small">Xóa toàn bộ ví, lịch sử, quà và bắt đầu lại?</b>
          <div className="row">
            <button className="btn outline sm grow" onClick={() => setConfirmReset(false)}>
              Giữ lại
            </button>
            <button
              className="btn dark sm grow"
              onClick={() => {
                store.reset();
                nav.go({ name: 'lobby' });
                onClose();
              }}
            >
              Xóa và chơi lại
            </button>
          </div>
        </div>
      ) : (
        <button className="btn dark" onClick={() => setConfirmReset(true)}>
          Đặt lại dữ liệu demo
        </button>
      )}
      <button className="btn link" onClick={onClose}>
        Đóng
      </button>
    </Sheet>
  );
}
