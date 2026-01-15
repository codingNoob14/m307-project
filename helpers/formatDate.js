// helpers/formatDate.js
export default function formatDate(date, locale = 'de-CH') {
  try {
    const d = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat(locale).format(d);
  } catch {
    return '';
  }
}

