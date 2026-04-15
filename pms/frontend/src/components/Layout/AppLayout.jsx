// src/components/Layout/AppLayout.jsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header  from './Header.jsx';

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const sideW = collapsed ? 72 : 256;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div style={{ flex: 1, marginLeft: sideW, transition: 'margin-left 250ms ease-out',
        display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header collapsed={collapsed} />
        <main style={{ flex: 1, overflowY: 'auto', paddingTop: 'var(--header-height)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
