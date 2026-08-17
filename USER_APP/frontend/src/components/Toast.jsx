import React from 'react'

const Toast = ({ message }) => (
  <div className={`toast ${message ? 'show' : ''}`}>{message}</div>
)

export default Toast
