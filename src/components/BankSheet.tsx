import { useState } from 'react';
import { EARN_RULES, TRANSFER_MIN_VND, type EarnActionId } from '../config';
import { store } from '../engine/game';
import { fmtVnd } from '../engine/util';
import { Sheet } from './common';
import { IcCheck } from './Icons';

/** Mô phỏng giao dịch ngân hàng để kiếm giọt mật (không có tiền thật) */
export function BankSheet({ actionId, onClose }: { actionId: EarnActionId; onClose: () => void }) {
  const rule = EARN_RULES.find((r) => r.id === actionId)!;
  const [amount, setAmount] = useState('100000');
  const [self, setSelf] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const verbs: Record<EarnActionId, string> = {
    login: 'Đăng nhập',
    transfer: 'Chuyển khoản',
    qr: 'Thanh toán QR',
    bill: 'Thanh toán hóa đơn',
    savings: 'Mở sổ tiết kiệm',
    invite: 'Gửi lời mời',
  };

  const submit = () => {
    const r = store.simulateTransaction(actionId, { amountVnd: Number(amount.replace(/\D/g, '')), selfTransfer: self });
    setMsg({ ok: r.ok, text: r.message });
  };

  return (
    <Sheet onClose={onClose} label={rule.label}>
      <div className="col" style={{ gap: 4 }}>
        <span className="badge" style={{ background: 'var(--honey-soft)', color: 'var(--honey-text-strong)' }}>
          MÔ PHỎNG GIAO DỊCH · KHÔNG CÓ TIỀN THẬT
        </span>
        <div className="display" style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>
          {rule.label}
        </div>
        <div className="small muted">
          +{rule.drops} giọt mật · {rule.note} · đã dùng {store.usedCount(actionId)}/{rule.limit === 99 ? '∞' : rule.limit}
        </div>
      </div>

      {msg ? (
        <div className="col" style={{ gap: 14, alignItems: 'center', textAlign: 'center', padding: '8px 0' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              background: msg.ok ? 'var(--lead-soft)' : 'var(--honey-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IcCheck size={32} color={msg.ok ? '#17754A' : '#8A5A00'} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}>{msg.text}</div>
          <button className="btn" style={{ width: '100%' }} onClick={onClose}>
            Xong
          </button>
          <button className="btn link" onClick={() => setMsg(null)}>
            Làm giao dịch khác
          </button>
        </div>
      ) : (
        <>
          {actionId === 'transfer' && (
            <>
              <label className="field">
                Số tiền chuyển (đồng)
                <input type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
              <div className="xs muted">Cần từ {fmtVnd(TRANSFER_MIN_VND)} để nhận giọt mật.</div>
              <label className="check">
                <input type="checkbox" checked={self} onChange={(e) => setSelf(e.target.checked)} />
                Chuyển đến tài khoản khác của chính tôi
              </label>
            </>
          )}
          {actionId === 'qr' && <div style={{ fontSize: 14 }}>Quét mã QR tại cửa hàng: Tiệm bánh Mật Ong · 85.000đ</div>}
          {actionId === 'bill' && <div style={{ fontSize: 14 }}>Hóa đơn tiền điện tháng này · 612.000đ</div>}
          {actionId === 'savings' && <div style={{ fontSize: 14 }}>Sổ tiết kiệm online kỳ hạn 1 tháng · 5.000.000đ</div>}
          {actionId === 'invite' && <div style={{ fontSize: 14 }}>Giả lập: một người bạn đã mở tài khoản, hoàn tất eKYC và có giao dịch đầu tiên.</div>}
          <button className="btn big" onClick={submit}>
            {verbs[actionId]}
          </button>
          <div className="xs muted" style={{ lineHeight: 1.5 }}>
            Trong app thật, giọt mật được cộng khi giao dịch thành công. Giao dịch bị hoàn hoặc hủy sẽ bị thu hồi giọt mật.
          </div>
        </>
      )}
    </Sheet>
  );
}
