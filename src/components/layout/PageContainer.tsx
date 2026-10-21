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
      className={`w-full max-w-[var(--page-max,94rem)] mx-auto ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
