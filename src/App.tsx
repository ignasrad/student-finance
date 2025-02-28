import "./setupPdf";
import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import PdfReader from './PdfReader';


function App() {  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <PdfReader />
  </div>
  );
}

export default App;
