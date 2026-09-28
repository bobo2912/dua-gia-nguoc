import { useState } from 'react';
import { RANKS, ROOMS } from '../config';
import { rankOf } from '../engine/game';
import { APP_BUILD, versionLabel } from '../version';
import { store } from '../engine/game';
import { useGame, useNav } from '../nav';
import { Sheet } from './common';

/** Công cụ dành cho người thử nghiệm, không có trong app thật */
export function DemoPanel({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const nav = useNav();
  const p = g.state.profile;
  const [confirmReset, setConfirmReset] = useState(false);
  const [checking, setChecking] = useState(false);
  const cur = rankOf(p.huntPoints);
  const diff = p.demoDifficulty ?? 'normal';
  const win = p.demoWinChance ?? 0;
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

      <div className="card flat" style={{ padding: 14, gap: 10, background: 'var(--honey-soft)', borderColor: 'var(--honey-deep)' }}>
        <b>Độ khó thợ săn ảo</b>
        <div className="seg" role="radiogroup" aria-label="Độ khó">
          {(
            [
              ['easy', 'Dễ'],
              ['normal', 'Vừa'],
              ['hard', 'Khó'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} role="radio" aria-checked={diff === id} className={diff === id ? 'on' : ''} onClick={() => store.demoSetDifficulty(id)}>
              {label}
            </button>
          ))}
        </div>
        <span className="xs muted" style={{ lineHeight: 1.5 }}>
          {diff === 'easy'
            ? 'Thợ săn ảo ra ít giá hơn một nửa, không trùng giá của bạn, không cướp ngôi, không bắn tỉa giây cuối. Giá thấp của bạn dễ duy nhất hơn nhiều.'
            : diff === 'hard'
              ? 'Thợ săn ảo ra nhiều giá hơn, hay trùng đúng giá bạn đang dẫn đầu và bắn tỉa giây cuối nhiều hơn.'
              : 'Hành vi mặc định: gần với người chơi thật.'}
        </span>
        <b style={{ marginTop: 4 }}>Hỗ trợ thắng khi gõ búa</b>
        <div className="seg" role="radiogroup" aria-label="Tỉ lệ hỗ trợ thắng">
          {[0, 0.3, 0.6, 1].map((v) => (
            <button key={v} role="radio" aria-checked={win === v} className={win === v ? 'on' : ''} onClick={() => store.demoSetWinChance(v)}>
              {v === 0 ? 'Tắt' : v === 1 ? 'Luôn' : `${v * 100}%`}
            </button>
          ))}
        </div>
        <span className="xs muted" style={{ lineHeight: 1.5 }}>
          Khi gõ búa, với tỉ lệ đã chọn, giá thấp nhất của bạn được đảm bảo là thấp nhất và duy nhất (chỉ cần bạn đã ra ít nhất 1 giá). Kết quả khi đó có ghi chú "được hỗ trợ".
        </span>
      </div>

      <div className="col" style={{ gap: 8 }}>
        <b>Giả lập Hũ mật (dồn thêm quà vào tổ)</b>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {ROOMS.map((r) => (
            <button key={r.id} className="btn outline sm" style={{ padding: '0 4px', fontSize: 13 }} onClick={() => store.demoAddJackpot(r.id)}>
              + {r.name}
            </button>
          ))}
        </div>
      </div>

      <div className="col" style={{ gap: 8 }}>
        <div className="row between">
          <b>Giả lập hạng</b>
          <span className="small muted">
            Đang: {cur.name} · {p.huntPoints.toLocaleString('vi-VN').replace(/,/g, '.')} điểm săn
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
          {RANKS.map((r) => (
            <button
              key={r.id}
              className={`btn sm ${cur.id === r.id ? '' : 'outline'}`}
              style={{ padding: 0, fontSize: 13 }}
              aria-pressed={cur.id === r.id}
              onClick={() => store.demoSetRank(r.id)}
            >
              <span style={{ width: 10, height: 10, borderRadius: 5, background: r.color, border: '1px solid #1C1712', flexShrink: 0 }} />
              {r.name}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          <button className="btn outline sm" onClick={() => store.demoAddHunt(100)}>
            +100 điểm săn
          </button>
          <button className="btn outline sm" onClick={() => store.demoAddHunt(-100)}>
            −100 điểm săn
          </button>
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
                // chơi lại như người mới: hiện lại hướng dẫn
                nav.openGuide();
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
      <div className="card flat" style={{ padding: 14, gap: 8 }}>
        <div className="row between">
          <b>Phiên bản</b>
          <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{versionLabel()}</span>
        </div>
        <span className="xs muted">Build lúc {new Date(APP_BUILD.time).toLocaleString('vi-VN')}</span>
        <button
          className="btn outline sm"
          disabled={checking}
          onClick={async () => {
            setChecking(true);
            await nav.checkUpdate(true);
            setChecking(false);
          }}
        >
          {checking ? 'Đang kiểm tra…' : 'Kiểm tra bản mới'}
        </button>
      </div>
      <button className="btn link" onClick={onClose}>
        Đóng
      </button>
    </Sheet>
  );
}
