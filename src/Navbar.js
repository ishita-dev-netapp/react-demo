import React from 'react';
import './Navbar.css'; 
import logo from './netapp_logo_transparent.png'; // Path to your logo image
const Navbar = () => {
    return (
        <div className="navbar">
           <div className='left'>
            <img src={logo} alt="NetApp Logo" className="logo" /></div>
            <div className='center'>Perf Data Visualization</div>
            <div className='right'></div>
            </div>
        );
    };

export default Navbar;