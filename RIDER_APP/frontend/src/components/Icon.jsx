import React from 'react'

const PATHS = {
  power: (<><path d="M12 3v8" /><path d="M6.2 6.5a8 8 0 1 0 11.6 0" /></>),
  bag: (<><path d="M6 8h12l1 11.5H5L6 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>),
  location: (<><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>),
  edit: (<><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13 7 4 4" /></>),
  truck: (<><path d="M3 6h11v11H3z" /><path d="M14 10h4l3 3v4h-7" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>),
  lock: (<><rect x="5" y="10.5" width="14" height="9" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /><path d="M12 14v2.5" /></>),
  home: (<><path d="M15 18H9" /><path d="M21.6359 12.9579L21.3572 14.8952C20.8697 18.2827 20.626 19.9764 19.451 20.9882C18.2759 22 16.5526 22 13.1061 22H10.8939C7.44737 22 5.72409 22 4.54903 20.9882C3.37396 19.9764 3.13025 18.2827 2.64284 14.8952L2.36407 12.9579C1.98463 10.3208 1.79491 9.00229 2.33537 7.87495C2.87583 6.7476 4.02619 6.06234 6.32691 4.69181L7.71175 3.86687C9.80104 2.62229 10.8457 2 12 2C13.1543 2 14.199 2.62229 16.2882 3.86687L17.6731 4.69181C19.9738 6.06234 21.1242 6.7476 21.6646 7.87495" /></>),
  orders: (<path d="M20 10L18.5145 17.4276C18.3312 18.3439 18.2396 18.8021 18.0004 19.1448C17.7894 19.447 17.499 19.685 17.1613 19.8326C16.7783 20 16.3111 20 15.3766 20H8.62337C7.6889 20 7.22166 20 6.83869 19.8326C6.50097 19.685 6.2106 19.447 5.99964 19.1448C5.76041 18.8021 5.66878 18.3439 5.48551 17.4276L4 10M3 10H21M8 13V13.01M16 13V13.01M6 10L9 4M18 10L15 4" />),
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>),
  star: (<path d="m12 3 2.8 5.7L21 9.6l-4.5 4.4 1.1 6.1L12 17.2 6.4 20l1.1-6L3 9.6l6.2-.9L12 3Z" />),
  arrow: (<><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>),
  'arrow-up': (<><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></>),
  check: (<path d="m5 12 4 4L19 6" />),
  chevron: (<path d="m15 18-6-6 6-6" />),
  refresh: (<><path d="M20 11a8 8 0 0 0-14.8-4.2L3 9" /><path d="M3 4v5h5" /><path d="M4 13a8 8 0 0 0 14.8 4.2L21 15" /><path d="M21 20v-5h-5" /></>),
  clock: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>),
  shield: (<><path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></>),
}

const Icon = ({ name, className = 'icon', style }) => {
  const paths = PATHS[name] || PATHS.star
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths}
    </svg>
  )
}

export default Icon
