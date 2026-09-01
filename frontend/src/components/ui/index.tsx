import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'blue' | 'orange' | 'red' | 'yellow' | 'purple' | 'gray' | 'cyan';
  className?: string;
}

const variantClasses = {
  green: 'bg-green-100 text-green-800',
  blue: 'bg-blue-100 text-blue-800',
  orange: 'bg-orange-100 text-orange-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  purple: 'bg-purple-100 text-purple-800',
  gray: 'bg-gray-100 text-gray-800',
  cyan: 'bg-cyan-100 text-cyan-800',
};

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'gray', className = '' }) => (
  <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${variantClasses[variant]} ${className}`}>
    {children}
  </span>
);

export const StatusBadge: React.FC<{ status: string; config: { label: string; bg: string; text: string } }> = ({ config }) => (
  <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${config.bg} ${config.text}`}>
    {config.label}
  </span>
);

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClass = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size];
  return (
    <div className={`${sizeClass} border-2 border-indigo-600 border-t-transparent rounded-full animate-spin`} />
  );
};

export const LoadingPage: React.FC = () => (
  <div className="flex items-center justify-center min-h-64">
    <Spinner size="lg" />
  </div>
);

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-xl w-full ${sizeClass} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  subtitle?: string;
  trend?: { value: number; positive: boolean };
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color = 'indigo', subtitle }) => {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`p-3 rounded-xl ${colors[color] || colors.indigo}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{ message?: string; icon?: React.ReactNode }> = ({
  message = 'No data found',
  icon
}) => (
  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
    {icon && <div className="mb-3">{icon}</div>}
    <p className="text-sm">{message}</p>
  </div>
);

export const FormField: React.FC<{
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}> = ({ label, required, children, error }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);
