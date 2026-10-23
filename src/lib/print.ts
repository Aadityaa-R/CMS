export const handlePrint = () => {
  document.body.classList.add('printing');
  const handleAfterPrint = () => {
    document.body.classList.remove('printing');
    window.removeEventListener('afterprint', handleAfterPrint);
  };
  window.addEventListener('afterprint', handleAfterPrint);
  window.print();
};

export const triggerPrint = handlePrint;

