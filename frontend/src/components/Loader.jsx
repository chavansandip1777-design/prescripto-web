import React from 'react'

const Loader = ({ full = false }) => {
  if (full) {
    return (
      <div style={{position:'fixed', inset:0, background:'rgba(255,255,255,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999}}>
        <div className='loader'>
          <svg className='animate-spin h-10 w-10 text-primary' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
            <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
            <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v8z'></path>
          </svg>
        </div>
      </div>
    )
  }
  return (
    <div className='inline-block'>
      <svg className='animate-spin h-5 w-5 text-primary' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
        <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
        <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v8z'></path>
      </svg>
    </div>
  )
}

export default Loader
