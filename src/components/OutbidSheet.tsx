import { fmtVnd } from '../engine/util';
import { Bee } from './Bee';
import { Sheet } from './common';
import { IcSwords } from './Icons';

export interface OutbidData {
  roomId: string;
  priceVnd: number;
  rivalTimes: number;
  bestLeftVnd: number | null;
}

export function OutbidSheet({ data, onCounter, onLater }: { data: OutbidData; onCounter: () => void; onLater: () => void }) {
  return (
    <Sheet onClose={onLater} label="Ngôi đầu bị cướp">
      <div style={{ alignSelf: 'center' }} className="shake">
        <Bee size={104} mood="worried" />
      </div>
      <div className="col" style={{ alignItems: 'center', gap: 4, textAlign: 'center' }}>
        <div className="display" style={{ fontSize: 30, lineHeight: 1.1, fontWeight: 800, color: 'var(--dup-text)' }}>
          Ngôi đầu bị cướp!
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.45 }}>
          Có người vừa ra đúng giá <b>{fmtVnd(data.priceVnd)}</b> của bạn.
        </div>
      </div>
      {data.rivalTimes >= 2 && (
        <div className="row" style={{ background: 'var(--ink)', color: 'var(--cream)', borderRadius: 16, padding: '12px 14px', gap: 12 }}>
          <IcSwords color="#F5B301" />
          <div className="col" style={{ gap: 2 }}>
            <b style={{ fontSize: 14, color: 'var(--honey)' }}>Kỳ phùng địch thủ</b>
            <span className="small">1 thợ săn đã trùng giá bạn {data.rivalTimes} lần trong phiên này.</span>
          </div>
        </div>
      )}
      <div className="row between" style={{ background: '#fff', border: '1.5px solid var(--line)', borderRadius: 16, padding: '12px 14px' }}>
        {data.bestLeftVnd !== null ? (
          <>
            <span style={{ fontSize: 14 }}>
              Giá tốt nhất còn lại: <b className="display" style={{ fontSize: 18 }}>{fmtVnd(data.bestLeftVnd)}</b>
            </span>
            <span className="pill unique" style={{ fontSize: 12 }}>
              Duy nhất
            </span>
          </>
        ) : (
          <span style={{ fontSize: 14 }}>Bạn chưa còn giá duy nhất nào trong phiên này.</span>
        )}
      </div>
      <button className="btn big" onClick={onCounter}>
        Phản công ngay
      </button>
      <button className="btn link" onClick={onLater}>
        Để sau
      </button>
    </Sheet>
  );
}
