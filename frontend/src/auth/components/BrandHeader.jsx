import React from 'react';
import { Link } from 'react-router-dom';
import { authConfig } from '../authConfig';

export function BrandHeader({ className = '' }) {
  return (
    <header className={`agrimap-auth-header ${className}`}>
      {/* Brand Lockup: Logo + V2V Tech + AGRIMAP DSP */}
      <Link to="/" className="agrimap-brand-lockup" aria-label="AgriMap DSP Home">
        <div className="agrimap-brand-icon-wrap">
          <img
            src={authConfig.brand.logoUrl}
            alt="V2V Tech Bulb Logo"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        <div className="agrimap-brand-text">
          <span className="agrimap-brand-title">V2V Tech</span>
          <span className="agrimap-brand-sub">{authConfig.brand.productName}</span>
        </div>
      </Link>

      {/* Top Right Support */}
      <div className="agrimap-header-support">
        <span>Need help?</span>
        <a
          href={`mailto:${authConfig.brand.supportEmail}?subject=AgriMap%20DSP%20Support`}
          className="agrimap-support-link"
        >
          Support
        </a>
      </div>
    </header>
  );
}

export default BrandHeader;
