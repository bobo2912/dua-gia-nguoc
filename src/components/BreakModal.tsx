import { SAFETY } from '../config';
import { Bee } from './Bee';

export function BreakModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Nhắc nghỉ">
      <div className="overlay-bg" onClick={onClose} />
      <div className="modal" style={{ alignItems: 'center', textAlign: 'center' }}>
        <Bee size={88} mood="happy" />
        <div className="display" style={{ fontSize: 24, fontWeight: 800 }}>
          Nghỉ tay chút nhé!
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.5 }}>
          Bạn đã săn liên tục hơn {SAFETY.breakReminderMin / 60} giờ. Đứng dậy vươn vai, uống ngụm nước rồi quay lại săn tiếp.
        </div>
        <button className="btn" style={{ width: '100%' }} onClick={onClose}>
          Mình biết rồi
        </button>
      </div>
    </div>
  );
}
