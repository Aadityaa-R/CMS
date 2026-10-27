import React from 'react';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`w-full ${className}`.trim()}
      style={{ maxWidth: 'var(--page-max)', marginInline: 'auto' }}
      {...props}
    >
      {children}
    </div>
  );
};
