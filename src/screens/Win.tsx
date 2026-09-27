import { useState } from 'react';
import { fmtDate, fmtVnd } from '../engine/util';
import { useGame, useNav } from '../nav';
import { Bee } from '../components/Bee';
import { PrizeImage } from '../components/common';
import { IcCheck, IcClose } from '../components/Icons';

const METHODS = ['Mã voucher điện tử trong app', 'Nhận tại chi nhánh', 'Giao tận nơi'];

export function Win({ sessionId }: { sessionId: string }) {
  const g = useGame();
  const nav = useNav();
  const prizes = g.state.profile.prizes.filter((p) => p.sessionId === sessionId);
  const [method, setMethod] = useState(METHODS[0]);
  if (!prizes.length) {
    return (
      <div className="scroll">
        <div className="section">
          Không tìm thấy quà.{' '}
          <button className="btn link" onClick={() => nav.go({ name: 'lobby' })}>
            Về sảnh
          </button>
        </div>
      </div>
    );
  }
  const pz = prizes[0];
  const claimed = prizes.every((p) => p.status === 'claimed');

  return (
    <div className="scroll" style={{ background: 'var(--honey)', display: 'flex', flexDirection: 'column', paddingBottom: 0 }}>
      <svg style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} width="100%" height="320" viewBox="0 0 390 320" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
        <g stroke="#1C1712" strokeWidth="2">
          <path d="M40 60l10 6v12l-10 6-10-6V66z" fill="#FFF6E0" />
          <path d="M340 40l8 5v10l-8 5-8-5V45z" fill="#1C1712" />
          <path d="M300 150l10 6v12l-10 6-10-6v-12z" fill="#FFF6E0" />
          <path d="M70 200l7 4v8l-7 4-7-4v-8z" fill="#1C1712" />
          <path d="M355 250l9 5v10l-9 5-9-5v-10z" fill="#D4A017" />
          <path d="M28 290l8 5v10l-8 5-8-5v-10z" fill="#D4A017" />
        </g>
      </svg>
      <div className="row" style={{ justifyContent: 'flex-end', padding: '12px 16px 0', position: 'relative' }}>
        <button className="icon-btn light" aria-label="Đóng" onClick={() => nav.go({ name: 'lobby' })}>
          <IcClose />
        </button>
      </div>
      <div className="col" style={{ alignItems: 'center', gap: 4, padding: '0 24px', textAlign: 'center', position: 'relative' }}>
        <div className="pulse">
          <Bee size={150} mood="joy" gavel="side" bodyColor="#FFF6E0" />
        </div>
        <div className="display" style={{ fontSize: 38, lineHeight: 1, fontWeight: 800 }}>
          Bạn đã săn được!
        </div>
        <div style={{ fontSize: 15 }}>Giá chốt của bạn thấp nhất và duy nhất</div>
        <div className="display" style={{ fontSize: 56, lineHeight: 1.1, fontWeight: 800 }}>
          {fmtVnd(pz.priceVnd)}
        </div>
      </div>

      <div
        className="col"
        style={{ marginTop: 16, flex: 1, background: 'var(--cream)', borderTop: '3px solid var(--ink)', borderRadius: '28px 28px 0 0', padding: '20px 16px 28px', gap: 14, position: 'relative' }}
      >
        {prizes.map((p) => (
          <div key={p.id} className="card" style={{ flexDirection: 'row', alignItems: 'center', padding: 12, boxShadow: 'none' }}>
            <PrizeImage size={64} />
            <div className="col" style={{ gap: 2 }}>
              <div className="display" style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.15 }}>
                {p.prize.name}
              </div>
              <div className="small" style={{ fontWeight: 700, color: 'var(--lead)' }}>
                Quà tặng miễn phí, bạn không phải thanh toán
              </div>
            </div>
          </div>
        ))}

        {claimed ? (
          <div className="col" style={{ alignItems: 'center', gap: 10, textAlign: 'center', padding: '12px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, background: 'var(--lead-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IcCheck size={32} color="#17754A" />
            </div>
            <div className="display" style={{ fontSize: 22, fontWeight: 800 }}>
              Đã xác nhận nhận quà
            </div>
            <div className="small">Cách nhận: {pz.method}. Ngân hàng sẽ liên hệ theo thông tin eKYC của bạn.</div>
          </div>
        ) : (
          <>
            <fieldset style={{ margin: 0, padding: 0, border: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <legend className="display" style={{ padding: 0, marginBottom: 8, fontSize: 19, fontWeight: 800 }}>
                Chọn cách nhận quà
              </legend>
              {METHODS.map((m) => (
                <label
                  key={m}
                  className="row"
                  style={{
                    minHeight: 52,
                    padding: '0 14px',
                    borderRadius: 14,
                    background: '#fff',
                    border: method === m ? '2px solid var(--ink)' : '1.5px solid var(--line)',
                    fontSize: 15,
                    fontWeight: method === m ? 600 : 400,
                    gap: 12,
                  }}
                >
                  <input type="radio" name="nhanqua" checked={method === m} onChange={() => setMethod(m)} style={{ width: 20, height: 20, accentColor: '#1C1712' }} />
                  {m}
                </label>
              ))}
            </fieldset>
            <div className="small" style={{ lineHeight: 1.5, color: '#4F4436' }}>
              Người nhận: <b>{g.state.profile.name}</b>, lấy từ hồ sơ eKYC.
              <br />
              Hãy xác nhận trước <b>23:59 ngày {fmtDate(pz.deadline)}</b>.
            </div>
            <button
              className="btn big"
              onClick={() => {
                prizes.forEach((p) => g.claimPrize(p.id, method));
                nav.toast('Đã xác nhận nhận quà!', 'good');
              }}
            >
              Xác nhận nhận quà
            </button>
          </>
        )}
        <button className="btn outline" onClick={() => nav.go({ name: 'result', sessionId })}>
          Xem kết quả phiên
        </button>
        <button
          className="btn link"
          onClick={() => {
            const text = `Mình vừa săn được ${pz.prize.name} với giá ${fmtVnd(pz.priceVnd)} trong app Đấu giá!`;
            const copy = () =>
              navigator.clipboard
                ?.writeText(text)
                .then(() => nav.toast('Đã chép lời khoe vào bộ nhớ tạm', 'good'))
                .catch(() => nav.toast(text, 'info'));
            if (navigator.share) navigator.share({ text }).catch(copy);
            else copy();
          }}
        >
          Khoe chiến tích
        </button>
      </div>
    </div>
  );
}
