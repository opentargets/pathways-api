// Mock pathway data for testing D3 sunburst component
export const mockPathwayData = [
  {
    "ID": "R-HSA-109582",
    "Pathway": "Hemostasis",
    "ES": 0.347,
    "NES": 2.892,
    "FDR": 0.188,
    "p-value": 0.0038,
    "Number of input genes": 40,
    "Leading edge genes": "GATA3,MYB,ABL1,NRAS,PTPN11,IRF1,RASGRP1",
    "Pathway size": 706,
    "Parent pathway": ""
  },
  {
    "ID": "R-HSA-109583",
    "Pathway": "Blood Coagulation",
    "ES": 0.298,
    "NES": 2.156,
    "FDR": 0.245,
    "p-value": 0.0072,
    "Number of input genes": 32,
    "Leading edge genes": "F2,F7,F8,F9,F10,F11,F12",
    "Pathway size": 156,
    "Parent pathway": "R-HSA-109582"
  },
  {
    "ID": "R-HSA-109584",
    "Pathway": "Platelet Activation",
    "ES": 0.267,
    "NES": 1.987,
    "FDR": 0.312,
    "p-value": 0.0125,
    "Number of input genes": 28,
    "Leading edge genes": "GP1BA,GP1BB,GP9,ITGA2B,ITGB3",
    "Pathway size": 89,
    "Parent pathway": "R-HSA-109582"
  },
  {
    "ID": "R-HSA-109585",
    "Pathway": "Fibrinolysis",
    "ES": 0.234,
    "NES": 1.756,
    "FDR": 0.389,
    "p-value": 0.0187,
    "Number of input genes": 24,
    "Leading edge genes": "PLG,PLAU,PLAT,SERPINE1",
    "Pathway size": 67,
    "Parent pathway": "R-HSA-109582"
  },
  {
    "ID": "R-HSA-109586",
    "Pathway": "Immune Response",
    "ES": 0.412,
    "NES": 3.124,
    "FDR": 0.156,
    "p-value": 0.0023,
    "Number of input genes": 45,
    "Leading edge genes": "IL2,IL4,IL6,IL10,IFNG,TNF",
    "Pathway size": 892,
    "Parent pathway": ""
  },
  {
    "ID": "R-HSA-109587",
    "Pathway": "T Cell Activation",
    "ES": 0.356,
    "NES": 2.678,
    "FDR": 0.201,
    "p-value": 0.0045,
    "Number of input genes": 38,
    "Leading edge genes": "CD3D,CD3E,CD3G,CD4,CD8A",
    "Pathway size": 234,
    "Parent pathway": "R-HSA-109586"
  },
  {
    "ID": "R-HSA-109588",
    "Pathway": "B Cell Activation",
    "ES": 0.289,
    "NES": 2.234,
    "FDR": 0.278,
    "p-value": 0.0089,
    "Number of input genes": 31,
    "Leading edge genes": "CD19,CD20,CD21,CD22,CD79A",
    "Pathway size": 178,
    "Parent pathway": "R-HSA-109586"
  },
  {
    "ID": "R-HSA-109589",
    "Pathway": "Metabolism",
    "ES": 0.198,
    "NES": 1.456,
    "FDR": 0.445,
    "p-value": 0.0234,
    "Number of input genes": 22,
    "Leading edge genes": "GLUT1,GLUT2,GLUT3,GLUT4",
    "Pathway size": 456,
    "Parent pathway": ""
  },
  {
    "ID": "R-HSA-109590",
    "Pathway": "Glycolysis",
    "ES": 0.167,
    "NES": 1.234,
    "FDR": 0.512,
    "p-value": 0.0345,
    "Number of input genes": 19,
    "Leading edge genes": "HK1,HK2,PFKM,ALDOA,ENO1",
    "Pathway size": 123,
    "Parent pathway": "R-HSA-109589"
  },
  {
    "ID": "R-HSA-109591",
    "Pathway": "Oxidative Phosphorylation",
    "ES": 0.145,
    "NES": 1.089,
    "FDR": 0.567,
    "p-value": 0.0456,
    "Number of input genes": 16,
    "Leading edge genes": "NDUFA1,NDUFA2,NDUFA3,NDUFA4",
    "Pathway size": 98,
    "Parent pathway": "R-HSA-109589"
  }
];
