import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// react-datepickerのスタイルをReact Native Webに適用するためのラッパー
// CSSがグローバルに適用されるため、このコンポーネントをインポートするだけでスタイルが読み込まれます。

interface Props {
  selected: Date;
  onChange: (date: Date) => void;
}

export const WebDatePicker: React.FC<Props> = ({ selected, onChange }) => {
  return (
    <div className="web-datepicker-wrapper">
      <DatePicker
        selected={selected}
        onChange={onChange}
        inline // モーダル内でインライン表示する
      />
    </div>
  );
};
