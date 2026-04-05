import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css';

import Login from './pages/Login';
import Home from './pages/Home';
import Forbidden from './pages/Forbidden';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js'; 
import Finanzas from './pages/Finanzas';
import SecretariaTrazados from './pages/SecretariaTrazados';
import Asistencias from './pages/Asistencias';
import Limosnero from './pages/Limosnero';
import Hospitalario from './pages/Hospitalario';
import Tesoreria from './pages/Tesoreria';
import Miembros from './pages/Miembros';
import CuadroActivos from './pages/CuadroActivos';
 

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Home /> },

      { path: 'finanzas', element: (
        <ProtectedRoute requirePerm="finanzas.view"><Finanzas/></ProtectedRoute>
      )},
      { path: 'secretaria', element: (
        <ProtectedRoute requirePerm="secretaria.view"><SecretariaTrazados/></ProtectedRoute>
      )},
      { path: 'asistencias', element: (
        <ProtectedRoute requirePerm="asistencias.view"><Asistencias/></ProtectedRoute>
      )},
      { path: 'limosnero', element: (
        <ProtectedRoute requirePerm="limosnero.view"><Limosnero/></ProtectedRoute>
      )},
      { path: 'hospitalario', element: (
        <ProtectedRoute requirePerm="hospitalario.view"><Hospitalario/></ProtectedRoute>
      )},
      {
  path: 'tesoreria',
  element: (
    <ProtectedRoute requirePerm="tesoreria.view"><Tesoreria /></ProtectedRoute>
  )
},
{
  path: 'miembros',
  element: (
    <ProtectedRoute requirePerm="miembros.manage"><Miembros /></ProtectedRoute>
  )
},
{
  path: 'cuadro-activos',
  element: (
    <ProtectedRoute requirePerm="miembros.manage"><CuadroActivos /></ProtectedRoute>
  )
},

      { path: '403', element: <Forbidden/> },
    ]
  }
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router}/>
    </AuthProvider>
  </React.StrictMode>
);
