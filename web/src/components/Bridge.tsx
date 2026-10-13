export const Bridge = () => (
  <svg viewBox="0 0 330 205" className="bridge-art" aria-hidden="true">
    <circle className="bridge-sun" cx="256" cy="46" r="25" fill="#e6b573" />
    <g className="bridge-sparkles">
      <circle cx="71" cy="54" r="2.4" fill="#dce5d4" />
      <circle cx="103" cy="33" r="1.7" fill="#eddfba" />
      <circle cx="297" cy="79" r="1.9" fill="#dce5d4" />
    </g>
    <path
      className="bridge-land"
      d="M0 181Q81 150 159 176T330 178V205H0"
      fill="#496558"
    />
    <path
      className="bridge-span bridge-span-outer"
      d="M47 158V126a118 118 0 0 1 236 0v32"
      fill="none"
      stroke="#719182"
      strokeWidth="24"
    />
    <path
      className="bridge-span bridge-span-middle"
      d="M75 158V129a90 90 0 0 1 180 0v29"
      fill="none"
      stroke="#dce5d4"
      strokeWidth="17"
    />
    <path
      className="bridge-span bridge-span-inner"
      d="M105 158V134a60 60 0 0 1 120 0v24"
      fill="none"
      stroke="#b9cbb6"
      strokeWidth="13"
    />
    <path
      className="bridge-road"
      d="M28 162h273"
      stroke="#eddfba"
      strokeWidth="9"
      strokeLinecap="round"
    />
    <path
      className="bridge-water"
      d="M11 193q58-13 107 0t92 0t111 0"
      fill="none"
      stroke="#98afa0"
      strokeWidth="2"
    />
    <path
      className="bridge-tree"
      d="M311 157v-31m0 13-13-13m13 7 10-15"
      stroke="#a8c0a4"
      strokeWidth="3"
      fill="none"
    />
  </svg>
);
