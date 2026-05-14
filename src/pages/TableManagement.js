import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../api";

const MODULES = [
  "SETUP",
  "CEST",
  "SSCP",
  "DRRM",
  "Special Project",
  "Calibration",
  "Package & Labeling",
  "S&T Promo",
  "TACS",
  "Tech Promo",
  "Tech Rollout",
  "Tech Training",
];

const FIELD_TYPES = [
  "Text",
  "Number",
  "Currency",
  "Date",
  "Date Range",
  "Dropdown",
  "Textarea",
  "Address",
  "Radio",
  "Yes/No",
  "Link / File",
  "Hidden / View Only",
  "Hidden / Auto From Date",
  "Hidden / Computed",
  "Auto / Computed",
  "Auto / Read Only",
  "Multi-Select Dropdown",
  "Photo Upload",
];

const DEFAULT_CONFIGS = {
  SETUP: {
    columns: [
      { label: "No.", key: "no", type: "Auto Number", visible: true, required: false },
      { label: "Name of Firm", key: "firmName", type: "Text", visible: true, required: true },
      { label: "SPIN Number", key: "spinNumber", type: "Text", visible: true, required: false },
      { label: "Sector", key: "sector", type: "Dropdown", visible: true, required: false },
      { label: "District", key: "district", type: "Auto / Read Only", visible: true, required: false },
      { label: "Venue/Address", key: "address", type: "Address", visible: true, required: true },
      { label: "Amount", key: "amount", type: "Currency", visible: true, required: true },
      { label: "S&T Intervention", key: "stIntervention", type: "View Button", visible: true, required: false },
      { label: "Other Indicators", key: "otherIndicators", type: "Report Table", visible: true, required: false },
      { label: "Status", key: "status", type: "Dropdown", visible: true, required: false },
      { label: "Type", key: "type", type: "Dropdown", visible: true, required: false },
      { label: "Date Approved", key: "dateApproved", type: "Date", visible: true, required: false },
      { label: "Actions", key: "actions", type: "Action Buttons", visible: true, required: false },
    ],

    formFields: [
      { id: "projectTitle", label: "Project Title", key: "projectTitle", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "firmName", label: "Name of Firm", key: "firmName", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "cooperatorName", label: "Cooperator Name", key: "cooperatorName", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "age", label: "Age", key: "age", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "sex", label: "Sex", key: "sex", type: "Dropdown", showAdd: true, showEdit: true, required: false },
      { id: "spinNumber", label: "SPIN Number", key: "spinNumber", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "sector", label: "Sector", key: "sector", type: "Dropdown", showAdd: true, showEdit: true, required: false },
      { id: "district", label: "District", key: "district", type: "Hidden / View Only", showAdd: false, showEdit: false, required: false },
      { id: "funded", label: "Funded", key: "funded", type: "Dropdown", showAdd: true, showEdit: true, required: false },
      { id: "amount", label: "Amount", key: "amount", type: "Currency", showAdd: true, showEdit: true, required: true },
      { id: "status", label: "Status", key: "status", type: "Dropdown", showAdd: true, showEdit: true, required: false },
      { id: "type", label: "Type", key: "type", type: "Dropdown", showAdd: true, showEdit: true, required: false },
      { id: "address", label: "Venue/Address", key: "address", type: "Address", showAdd: true, showEdit: true, required: true },
      { id: "nameOfStaff", label: "Name of Staff", key: "nameOfStaff", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "remarks", label: "Remarks", key: "remarks", type: "Textarea", showAdd: true, showEdit: true, required: false },
      { id: "dateApproved", label: "Date Approved", key: "dateApproved", type: "Date", showAdd: false, showEdit: true, required: false },
      { id: "stIntervention", label: "S&T Intervention", key: "stIntervention", type: "Hidden / View Only", showAdd: false, showEdit: false, required: false },
      { id: "otherIndicators", label: "Other Indicators", key: "otherIndicators", type: "Hidden / View Only", showAdd: false, showEdit: false, required: false },
    ],

    dropdowns: {
      Sex: ["M", "F"],
      Funded: ["N", "Y"],
      Status: ["Ongoing", "Terminated", "Graduated"],
      Type: ["Phase 1 (New)", "Phase 2", "Phase 3"],

      Sector: [
        "Food Processing",
        "Crop and animal production, hunting, and related service activities",
        "Forestry and Logging",
        "Fishing and Aquaculture",
        "Furniture Manufacturing",
        "Fabricated Metal Products Manufacturing",
        "Machinery and Equipment, NEC (Not Elsewhere Classified) Manufacturing",
        "Information and Communication",
        "Basic Pharmaceutical Products and Pharmaceutical Preparations Manufacturing",
        "Beverage Manufacturing",
        "Textile Manufacturing",
        "Wood and Products of Wood and Cork Manufacturing",
        "Paper and Paper Products Manufacturing",
        "Rubber and Plastic Products Manufacturing",
        "Non-metallic Mineral Products Manufacturing",
        "Other Transport Equipment Manufacturing",
        "Weaving Apparel Manufacturing",
        "Leather and Related Products Manufacturing",
        "Chemicals and Chemical Products Manufacturing",
      ],

      "S&T Intervention Type": [
        "Training",
        "Tech Roll Out",
        "TACS",
        "Packaging & Labeling",
        "Calibration",
        "TNA Report",
      ],

      "TACS Consultancy Type": [
        "Plant layout",
        "Simple TACS",
        "Food safety/assessment",
        "Cleaner Production",
        "Energy audit",
      ],

      "Packaging Service Type": [
        "Label Design",
        "Packaging Design",
        "Label Printing",
        "Packaging Material",
        "Other Packaging Support",
      ],

      "Calibration Category": ["PAYING", "NON-PAYING"],
      "Calibration Type of Samples": ["Weighing Scale", "Bucket"],
      "Calibration MC Range": ["<100 Kg", ">=100 Kg"],

      "Tech Roll Out Mode of Transfer": [
        "Commercialization",
        "Extension",
        "Public Good",
      ],

      "Tech Roll Out Classification": [
        "Individual",
        "MSME/Firm",
        "Academe",
        "LGU",
        "Cooperative/Association",
      ],

      "Report Indicator": [
        "No. of Jobs Generated",
        "% increase in jobs generated",
        "% improvement in productivity",
        "Amount of gross sales generated (in Php'000)",
      ],

      Quarter: ["Q1", "Q2", "Q3", "Q4"],
      District: ["District 1", "District 2", "District 3", "District 4", "District 5", "District 6"],
    },

    sampleRows: [
      {
        "No.": "1",
        "Name of Firm": "ABC Food Products",
        "SPIN Number": "SPIN-2026-001",
        Sector: "Food Processing",
        District: "District 5",
        "Venue/Address": "Urdaneta City, Pangasinan",
        Amount: "₱850,000.00",
        "S&T Intervention": "Training, TACS",
        "Other Indicators": "Jobs: 4 / Sales: ₱120,000",
        Status: "Ongoing",
        Type: "Phase 1 (New)",
        "Date Approved": "2026-02-12",
        Actions: "View / Edit / Print / Export / Delete",
      },
      {
        "No.": "2",
        "Name of Firm": "MetalWorks Pangasinan",
        "SPIN Number": "SPIN-2026-002",
        Sector: "Fabricated Metal Products Manufacturing",
        District: "District 3",
        "Venue/Address": "San Carlos City, Pangasinan",
        Amount: "₱1,200,000.00",
        "S&T Intervention": "Tech Roll Out, Calibration",
        "Other Indicators": "Jobs: 8 / Sales: ₱300,000",
        Status: "Graduated",
        Type: "Phase 2",
        "Date Approved": "2026-03-20",
        Actions: "View / Edit / Print / Export / Delete",
      },
    ],
  },

  CEST: {
    columns: [
      { label: "No.", key: "no", type: "Auto Number", visible: true, required: false },
      { label: "Type", key: "type", type: "Dropdown", visible: true, required: true },
      { label: "Project Title", key: "projectTitle", type: "Text", visible: true, required: true },
      { label: "Date of Project Approval", key: "dateProjectApproval", type: "Date", visible: true, required: true },
      { label: "Approved Project Cost (in Peso)", key: "approvedProjectCost", type: "Currency", visible: true, required: true },
      { label: "Name of Association / Cooperative", key: "associationName", type: "Text", visible: true, required: true },
      { label: "Venue/Address", key: "address", type: "Address", visible: true, required: true },
      { label: "Name of LGU-Communities", key: "lguNumbersOfCommunities", type: "Text", visible: true, required: false },
      { label: "Number of MOA", key: "numberOfMoa", type: "Number", visible: true, required: false },
      { label: "Name of Project Proponent", key: "projectProponent", type: "Text", visible: true, required: true },
      { label: "Sex", key: "sex", type: "Dropdown", visible: true, required: false },
      { label: "Name of Staff", key: "staffName", type: "Text", visible: true, required: false },
      { label: "Process/System Developed/Improved", key: "processSystem", type: "Textarea", visible: true, required: false },
      { label: "Communities Assisted", key: "communitiesAssisted", type: "Number", visible: true, required: false },
      { label: "Technologies Deployed", key: "technologiesDeployed", type: "Number", visible: true, required: false },
      { label: "Beneficiaries", key: "beneficiaries", type: "Number", visible: true, required: false },
      { label: "Startups Assisted", key: "startupsAssisted", type: "Number", visible: true, required: false },
      { label: "Jobs Generated", key: "jobsGenerated", type: "Number", visible: true, required: false },
      { label: "S&T Intervention Provided", key: "interventions", type: "View Button", visible: true, required: false },
      { label: "Actions", key: "actions", type: "Action Buttons", visible: true, required: false },
    ],
    formFields: [
      { id: "quarter", label: "Quarter", key: "quarter", type: "Dropdown", showAdd: true, showEdit: true, required: true },
      { id: "type", label: "Type", key: "type", type: "Dropdown", showAdd: true, showEdit: true, required: true },
      { id: "projectTitle", label: "Project Title", key: "projectTitle", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "dateProjectApproval", label: "Date of Project Approval", key: "dateProjectApproval", type: "Date", showAdd: true, showEdit: true, required: true },
      { id: "approvedProjectCost", label: "Approved Project Cost (in Peso)", key: "approvedProjectCost", type: "Currency", showAdd: true, showEdit: true, required: true },
      { id: "dateFundRelease", label: "Date of Fund Release", key: "dateFundRelease", type: "Date", showAdd: true, showEdit: true, required: false },
      { id: "associationName", label: "Name of Association / Cooperative", key: "associationName", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "address", label: "Venue/Address", key: "address", type: "Address", showAdd: true, showEdit: true, required: true },
      { id: "lguNumbersOfCommunities", label: "Name of LGU-Communities", key: "lguNumbersOfCommunities", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "numberOfMoa", label: "Number of MOA", key: "numberOfMoa", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "projectProponent", label: "Name of Project Proponent", key: "projectProponent", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "sex", label: "Sex", key: "sex", type: "Dropdown", showAdd: true, showEdit: true, required: false },
      { id: "staffName", label: "Name of Staff", key: "staffName", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "processSystem", label: "Process/System Developed/Improved", key: "processSystem", type: "Textarea", showAdd: true, showEdit: true, required: false },
      { id: "communitiesAssisted", label: "Communities Assisted", key: "communitiesAssisted", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "technologiesDeployed", label: "Technologies Deployed", key: "technologiesDeployed", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "beneficiaries", label: "Beneficiaries", key: "beneficiaries", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "startupsAssisted", label: "Startups Assisted", key: "startupsAssisted", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "jobsGenerated", label: "Jobs Generated", key: "jobsGenerated", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "interventions", label: "S&T Intervention Provided", key: "interventions", type: "Hidden / View Only", showAdd: false, showEdit: false, required: false },
    ],
    dropdowns: {
      Quarter: ["1", "2", "3", "4"],
      Type: ["New Communities", "Continuing Communities"],
      Sex: ["M", "F"],
      "S&T Intervention Type": ["Training", "Tech Roll Out", "Tech Promo", "S&T Promo", "TACS", "Packaging & Labeling", "Calibration", "TNA Report"],
      "TACS Consultancy Type": ["Advisory Services", "Technical Assistance", "Process Improvement", "Product Development", "Packaging and Labeling", "Food Safety", "Calibration", "Business / Marketing", "Other"],
      "Calibration Category": ["PAYING", "NON-PAYING"],
      "Calibration Type of Samples": ["Weighing Scale", "Bucket"],
      "Calibration MC Range": ["<100 Kg", ">=100 Kg"],
      "Packaging Type of Intervention": ["Label Design", "Packaging Design", "Label Printing", "Packaging Material", "Other Packaging Support"],
      "Tech Promo / S&T Promo Mode of Promotion": ["Social Media", "Press Release", "Radio", "TV", "Print", "Forum / Event", "Exhibit", "Other"],
      "Tech Roll Out Mode of Transfer": ["Commercialization", "Extension", "Public Good"],
      "Tech Roll Out Classification": ["Individual", "MSME/Firm", "Academe", "LGU", "Cooperative/Association"],
    },
    sampleRows: [
      {
        "No.": "1",
        Type: "New Communities",
        "Project Title": "Community Livelihood Support",
        "Date of Project Approval": "2026-02-10",
        "Approved Project Cost (in Peso)": "₱750,000.00",
        "Name of Association / Cooperative": "Sample Farmers Association",
        "Venue/Address": "Urdaneta City, Pangasinan",
        "Name of LGU-Communities": "Urdaneta City",
        "Number of MOA": "1",
        "Name of Project Proponent": "Juan Dela Cruz",
        Sex: "M",
        "Name of Staff": "DOST Staff",
        "Process/System Developed/Improved": "Sample process improvement",
        "Communities Assisted": "2",
        "Technologies Deployed": "1",
        Beneficiaries: "80",
        "Startups Assisted": "1",
        "Jobs Generated": "4",
        "S&T Intervention Provided": "Training, Packaging & Labeling",
        Actions: "View / Edit / Delete",
      },
    ],
  },

  SSCP: {
    columns: [
      { label: "No.", key: "no", type: "Auto Number", visible: true, required: false },
      { label: "LGU / Community", key: "lguCommunity", type: "Text", visible: true, required: true },
      { label: "Venue/Address", key: "address", type: "Address", visible: true, required: true },
      { label: "MOA/MOU Type", key: "moaMouType", type: "Dropdown", visible: true, required: false },
      { label: "MOA/MOU Title", key: "moaMouTitle", type: "Text", visible: true, required: false },
      { label: "Partners", key: "partners", type: "Text", visible: true, required: false },
      { label: "Name of Staff", key: "staffName", type: "Text", visible: true, required: false },
      { label: "Recognized as Smart City", key: "isSmartCity", type: "Yes/No", visible: true, required: false },
      { label: "Smart City Recognition Date", key: "smartCityDate", type: "Date", visible: true, required: false },
      { label: "SSC Projects", key: "sscProjects", type: "Nested Table / View Button", visible: true, required: false },
      { label: "Total SSC Fund", key: "totalSscFund", type: "Currency", visible: true, required: false },
      { label: "Remarks", key: "remarks", type: "Textarea", visible: true, required: false },
      { label: "Actions", key: "actions", type: "Action Buttons", visible: true, required: false },
    ],
    formFields: [
      { id: "lguCommunity", label: "LGU / Community", key: "lguCommunity", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "address", label: "Venue/Address", key: "address", type: "Address", showAdd: true, showEdit: true, required: true },
      { id: "moaMouType", label: "MOA/MOU Type", key: "moaMouType", type: "Dropdown", showAdd: true, showEdit: true, required: false },
      { id: "moaMouTitle", label: "MOA/MOU Title", key: "moaMouTitle", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "partners", label: "Partners", key: "partners", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "staffName", label: "Name of Staff", key: "staffName", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "isSmartCity", label: "Recognized as Smart City", key: "isSmartCity", type: "Yes/No", showAdd: true, showEdit: true, required: false },
      { id: "smartCityDate", label: "Smart City Recognition Date", key: "smartCityDate", type: "Date", showAdd: true, showEdit: true, required: false },
      { id: "remarks", label: "Remarks", key: "remarks", type: "Textarea", showAdd: true, showEdit: true, required: false },
      { id: "sscProjects", label: "SSC Projects", key: "sscProjects", type: "Hidden / View Only", showAdd: false, showEdit: false, required: false },
    ],
    dropdowns: {
      "MOA/MOU Type": ["MOA", "MOU"],
      "Recognized as Smart City": ["Yes", "No"],
      Sex: ["M", "F"],
      "SSC Project Fields": ["Project Title", "Date of Project Approval", "Approved Project Cost", "Date of Fund Release", "Venue/Address", "Name of Project Proponent", "Sex", "Process/System"],
      "S&T Intervention Type": ["Training", "Tech Roll Out", "Tech Promo", "S&T Promo", "TACS", "Packaging & Labeling", "Calibration", "TNA Report"],
      "TACS Consultancy Type": ["Advisory Services", "Technical Assistance", "Process Improvement", "Product Development", "Packaging and Labeling", "Food Safety", "Calibration", "Business / Marketing", "Other"],
      "Tech Roll Out Mode of Transfer": ["Commercialization", "Extension", "Public Good"],
      "Tech Roll Out Classification": ["Individual", "MSME/Firm", "Academe", "LGU", "Cooperative/Association"],
      "Packaging Type of Intervention": ["Label Design", "Packaging Design", "Label Printing", "Packaging Material", "Other Packaging Support"],
      "Promo Mode of Promotion": ["Social Media", "Press Release", "Radio", "TV", "Print", "Forum / Event", "Exhibit", "Other"],
    },
    sampleRows: [
      {
        "No.": "1",
        "LGU / Community": "Urdaneta City",
        "Venue/Address": "Urdaneta City, Pangasinan",
        "MOA/MOU Type": "MOA",
        "MOA/MOU Title": "Smart City Partnership",
        Partners: "Sample Partner",
        "Name of Staff": "DOST Staff",
        "Recognized as Smart City": "Yes",
        "Smart City Recognition Date": "2026-03-01",
        "SSC Projects": "2 projects / View",
        "Total SSC Fund": "₱2,500,000.00",
        Remarks: "Sample only",
        Actions: "View / Add Projects / Edit / Delete",
      },
    ],
  },

  DRRM: {
    tables: {
      "Activities Table": {
        columns: [
          { label: "No.", key: "no", type: "Auto Number", visible: true, required: false },
          { label: "Title of Activity on DRR and CC Learning and Development", key: "activityTitle", type: "Text", visible: true, required: true },
          { label: "Type of Sector-Specific Learning and Development Intervention", key: "sectorInterventionType", type: "Dropdown", visible: true, required: true },
          { label: "Date Conducted", key: "dateConducted", type: "Date / Date Range", visible: true, required: true },
          { label: "Venue/Address", key: "venue", type: "Address", visible: true, required: true },
          { label: "Name of Co-Organizer", key: "coOrganizer", type: "Text", visible: true, required: false },
          { label: "Participants - Male", key: "participantsMale", type: "Number", visible: true, required: false },
          { label: "Participants - Female", key: "participantsFemale", type: "Number", visible: true, required: false },
          { label: "Participants - Total", key: "participantsTotal", type: "Auto / Computed", visible: true, required: false },
          { label: "Partners", key: "partners", type: "Multi-Select Dropdown", visible: true, required: false },
          { label: "Means of Verification", key: "meansVerification", type: "Link / File", visible: true, required: false },
          { label: "Month", key: "month", type: "Auto / Read Only", visible: true, required: false },
          { label: "Remarks", key: "remarks", type: "Textarea", visible: true, required: false },
          { label: "Actions", key: "actions", type: "Action Buttons", visible: true, required: false },
        ],
        formFields: [
          { id: "activityTitle", label: "Title of Activity on DRR and CC Learning and Development", key: "activityTitle", type: "Text", showAdd: true, showEdit: true, required: true },
          { id: "sectorInterventionType", label: "Type of Sector-Specific Learning and Development Intervention", key: "sectorInterventionType", type: "Dropdown", showAdd: true, showEdit: true, required: true },
          { id: "dateConducted", label: "Date Conducted", key: "dateConducted", type: "Date Range", showAdd: true, showEdit: true, required: true },
          { id: "venue", label: "Venue/Address", key: "venue", type: "Address", showAdd: true, showEdit: true, required: true },
          { id: "coOrganizer", label: "Name of Co-Organizer", key: "coOrganizer", type: "Text", showAdd: true, showEdit: true, required: false },
          { id: "participantsMale", label: "Participants - Male", key: "participantsMale", type: "Number", showAdd: true, showEdit: true, required: false },
          { id: "participantsFemale", label: "Participants - Female", key: "participantsFemale", type: "Number", showAdd: true, showEdit: true, required: false },
          { id: "partners", label: "Partners", key: "partners", type: "Multi-Select Dropdown", showAdd: true, showEdit: true, required: false },
          { id: "meansVerification", label: "Means of Verification", key: "meansVerification", type: "Link / File", showAdd: true, showEdit: true, required: false },
          { id: "remarks", label: "Remarks", key: "remarks", type: "Textarea", showAdd: true, showEdit: true, required: false },
          { id: "month", label: "Month", key: "month", type: "Hidden / Auto From Date", showAdd: false, showEdit: false, required: false },
        ],
        dropdowns: {
          "Type of Sector-Specific Learning and Development Intervention": [
            "Training",
            "Workshop",
            "Seminar",
            "Orientation",
            "Forum",
            "Technical Assistance",
            "Information, Education, and Communication Campaign",
            "Other"
          ],
          Partners: [
            "RDRRMC1",
            "Prevention and Mitigation Cluster Member",
            "OCD 1",
            "OCD",
            "PDRRMO Pangasinan",
            "DOST-PHIVOLCS",
            "DOST-PAGASA",
            "PHIVOLCS",
            "PAGASA",
            "DOST-STII",
            "DENR-MGB"
          ],
          Month: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
          Quarter: ["1st", "2nd", "3rd", "4th"],
        },
        sampleRows: [
          {
            "No.": "1",
            "Title of Activity on DRR and CC Learning and Development": "DRRM Learning and Development Activity",
            "Type of Sector-Specific Learning and Development Intervention": "Training",
            "Date Conducted": "2026-03-12",
            "Venue/Address": "Lingayen, Pangasinan",
            "Name of Co-Organizer": "PDRRMO Pangasinan",
            "Participants - Male": "20",
            "Participants - Female": "30",
            "Participants - Total": "50",
            Partners: "PDRRMO Pangasinan, OCD",
            "Means of Verification": "MOV Link",
            Month: "March",
            Remarks: "Sample only",
            Actions: "View / Edit / Delete",
          },
        ],
      },

      "IEC Materials": {
        columns: [
          { label: "No.", key: "no", type: "Auto Number", visible: true, required: false },
          { label: "Title of IEC Material", key: "iecTitle", type: "Dropdown", visible: true, required: true },
          { label: "Source", key: "source", type: "Dropdown", visible: true, required: true },
          { label: "Beneficiary - Male", key: "beneficiaryMale", type: "Number", visible: true, required: false },
          { label: "Beneficiary - Female", key: "beneficiaryFemale", type: "Number", visible: true, required: false },
          { label: "Beneficiary - Total", key: "beneficiaryTotal", type: "Auto / Computed", visible: true, required: false },
          { label: "Means of Verification", key: "meansVerification", type: "Link / File", visible: true, required: false },
          { label: "Month", key: "month", type: "Auto / Read Only", visible: true, required: false },
          { label: "Remarks", key: "remarks", type: "Textarea", visible: true, required: false },
          { label: "Actions", key: "actions", type: "Action Buttons", visible: true, required: false },
        ],
        formFields: [
          { id: "iecTitle", label: "Title of IEC Material", key: "iecTitle", type: "Dropdown", showAdd: true, showEdit: true, required: true },
          { id: "source", label: "Source", key: "source", type: "Dropdown", showAdd: true, showEdit: true, required: true },
          { id: "beneficiaryMale", label: "Beneficiary - Male", key: "beneficiaryMale", type: "Number", showAdd: true, showEdit: true, required: false },
          { id: "beneficiaryFemale", label: "Beneficiary - Female", key: "beneficiaryFemale", type: "Number", showAdd: true, showEdit: true, required: false },
          { id: "meansVerification", label: "Means of Verification", key: "meansVerification", type: "Link / File", showAdd: true, showEdit: true, required: false },
          { id: "remarks", label: "Remarks", key: "remarks", type: "Textarea", showAdd: true, showEdit: true, required: false },
          { id: "beneficiaryTotal", label: "Beneficiary - Total", key: "beneficiaryTotal", type: "Hidden / Computed", showAdd: false, showEdit: false, required: false },
          { id: "month", label: "Month", key: "month", type: "Hidden / Auto From Date", showAdd: false, showEdit: false, required: false },
        ],
        dropdowns: {
          "Title of IEC Material": [
            "DANAS Source Book (Book)",
            "Reference for Emergency and Disaster (REDBOOK)",
            "Natural Signs of tsunami (Poster)",
            "Tsunami Community Preparedness (Poster)",
            "Earthquake Community Preparedness (Poster)",
            "Phivolcs Earthquake Intensity Scale (Brochure)",
            "Heavy Rainfall"
          ],
          Source: ["PHIVOLCS", "DOST-STII", "PAGASA", "OCD", "DENR-MGB"],
          Month: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
          Quarter: ["1st", "2nd", "3rd", "4th"],
        },
        sampleRows: [
          {
            "No.": "1",
            "Title of IEC Material": "Reference for Emergency and Disaster (REDBOOK)",
            Source: "DOST-STII",
            "Beneficiary - Male": "15",
            "Beneficiary - Female": "25",
            "Beneficiary - Total": "40",
            "Means of Verification": "MOV Link",
            Month: "March",
            Remarks: "Sample only",
            Actions: "View / Edit / Delete",
          },
        ],
      },

      "Collaborations": {
        columns: [
          { label: "No.", key: "no", type: "Auto Number", visible: true, required: false },
          { label: "Title of Collaboration", key: "title", type: "Text", visible: true, required: true },
          { label: "Activity Date", key: "activityDate", type: "Date", visible: true, required: true },
          { label: "Stakeholders", key: "stakeholders", type: "Multi-Select Dropdown", visible: true, required: false },
          { label: "Means of Verification", key: "meansOfVerification", type: "Link / File", visible: true, required: false },
          { label: "Remarks", key: "remarks", type: "Textarea", visible: true, required: false },
          { label: "Actions", key: "actions", type: "Action Buttons", visible: true, required: false },
        ],
        formFields: [
          { id: "title", label: "Title of Collaboration", key: "title", type: "Text", showAdd: true, showEdit: true, required: true },
          { id: "activityDate", label: "Activity Date", key: "activityDate", type: "Date", showAdd: true, showEdit: true, required: true },
          { id: "stakeholders", label: "Stakeholders", key: "stakeholders", type: "Multi-Select Dropdown", showAdd: true, showEdit: true, required: false },
          { id: "meansOfVerification", label: "Means of Verification", key: "meansOfVerification", type: "Link / File", showAdd: true, showEdit: true, required: false },
          { id: "remarks", label: "Remarks", key: "remarks", type: "Textarea", showAdd: true, showEdit: true, required: false },
        ],
        dropdowns: {
          Stakeholders: [
            "RDRRMC1",
            "OCD 1",
            "PDRRMO Pangasinan",
            "DOST-PHIVOLCS",
            "DOST-PAGASA",
            "PHIVOLCS",
            "PAGASA",
            "DOST-STII",
            "DENR-MGB",
            "LGU",
            "Academe",
            "Private Sector",
            "Civil Society Organization",
            "Other"
          ],
          Month: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
          Quarter: ["1st", "2nd", "3rd", "4th"],
        },
        sampleRows: [
          {
            "No.": "1",
            "Title of Collaboration": "DRRM Coordination Meeting",
            "Activity Date": "2026-03-15",
            Stakeholders: "PDRRMO Pangasinan, OCD",
            "Means of Verification": "MOV Link",
            Remarks: "Sample only",
            Actions: "View / Edit / Delete",
          },
        ],
      },
    },
  },

  "Special Project": {
    columns: [
      { label: "No.", key: "no", type: "Auto Number", visible: true, required: false },
      { label: "Name of Beneficiary", key: "beneficiaryName", type: "Text", visible: true, required: true },
      { label: "Venue/Address", key: "address", type: "Address", visible: true, required: true },
      { label: "Special Project", key: "specialProject", type: "Dropdown", visible: true, required: true },
      { label: "Project Title", key: "projectTitle", type: "Text", visible: true, required: true },
      { label: "Date Project Approved", key: "dateProjectApproved", type: "Date", visible: true, required: true },
      { label: "Project Cost", key: "projectCost", type: "Currency", visible: true, required: true },
      { label: "Means of Verification", key: "meansOfVerification", type: "Link / File", visible: true, required: false },
      { label: "Name of Staff", key: "staffName", type: "Text", visible: true, required: false },
      { label: "Quarter", key: "quarter", type: "Auto / Read Only", visible: true, required: false },
      { label: "S&T Interventions", key: "sntInterventions", type: "View Button", visible: true, required: false },
      { label: "Actions", key: "actions", type: "Action Buttons", visible: true, required: false },
    ],
    formFields: [
      { id: "specialProject", label: "Special Project", key: "specialProject", type: "Dropdown", showAdd: true, showEdit: true, required: true },
      { id: "projectTitle", label: "Project Title", key: "projectTitle", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "projectCost", label: "Project Cost", key: "projectCost", type: "Currency", showAdd: true, showEdit: true, required: true },
      { id: "dateProjectApproved", label: "Date Project Approved", key: "dateProjectApproved", type: "Date", showAdd: true, showEdit: true, required: true },
      { id: "beneficiaryName", label: "Name of Beneficiary", key: "beneficiaryName", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "address", label: "Venue/Address", key: "address", type: "Address", showAdd: true, showEdit: true, required: true },
      { id: "meansOfVerification", label: "Means of Verification", key: "meansOfVerification", type: "Link / File", showAdd: true, showEdit: true, required: false },
      { id: "staffName", label: "Name of Staff", key: "staffName", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "quarter", label: "Quarter", key: "quarter", type: "Hidden / Auto From Date", showAdd: false, showEdit: false, required: false },
      { id: "sntInterventions", label: "S&T Interventions", key: "sntInterventions", type: "Hidden / View Only", showAdd: false, showEdit: false, required: false },
    ],
    dropdowns: {
      "Special Project": ["STARBOOKS", "IFUND", "TECHGROW", "SILLAG", "GRIND", "ONEASIN"],
      "S&T Intervention Type": ["Training", "Tech Roll Out", "TACS", "Packaging & Labeling", "Calibration", "TNA Report"],
      "TACS Consultancy Type": ["Advisory Services", "Technical Assistance", "Process Improvement", "Product Development", "Packaging and Labeling", "Food Safety", "Calibration", "Business / Marketing", "Other"],
      "Tech Roll Out Mode of Transfer": ["Commercialization", "Extension", "Public Good"],
      "Tech Roll Out Classification": ["Individual", "MSME/Firm", "Academe", "LGU", "Cooperative/Association"],
      "Packaging Type of Intervention": ["Label Design", "Packaging Design", "Label Printing", "Packaging Material", "Other Packaging Support"],
      "Promo Mode of Promotion": ["Social Media", "Press Release", "Radio", "TV", "Print", "Forum / Event", "Exhibit", "Other"],
      Sex: ["M", "F", "N/A"],
      Quarter: ["1Q", "2Q", "3Q", "4Q"],
    },
    sampleRows: [
      {
        "No.": "1",
        "Name of Beneficiary": "Juan Dela Cruz",
        "Venue/Address": "Urdaneta City, Pangasinan",
        "Special Project": "STARBOOKS",
        "Project Title": "STARBOOKS Deployment",
        "Date Project Approved": "2026-02-20",
        "Project Cost": "₱500,000.00",
        "Means of Verification": "MOV Link",
        "Name of Staff": "DOST Staff",
        Quarter: "1Q",
        "S&T Interventions": "View / Add",
        Actions: "View / Edit / Print / Export / Delete",
      },
    ],
  },

  "Tech Rollout": {
    columns: [
      { label: "No.", key: "no", type: "Auto Number", visible: true, required: false },
      { label: "Quarter", key: "quarter", type: "Auto / Read Only", visible: true, required: false },
      { label: "Unit/Center", key: "unitCenter", type: "Text", visible: true, required: false },
      { label: "Name of Knowledge/Technology Transferred", key: "nameOfTechnologyTransferred", type: "Text", visible: true, required: true },
      { label: "Technology Generator", key: "technologyGenerator", type: "Text", visible: true, required: true },
      { label: "Mode of Transfer", key: "modeOfTransfer", type: "Dropdown", visible: true, required: true },
      { label: "DOST-developed/funded", key: "isDostDevelopedFunded", type: "Yes/No", visible: true, required: false },
      { label: "Date Transferred", key: "dateTransferred", type: "Date", visible: true, required: true },
      { label: "Activity Title", key: "activityTitle", type: "Text", visible: true, required: true },
      { label: "Activity Date", key: "activityDate", type: "Date", visible: true, required: false },
      { label: "Activity Venue", key: "activityVenue", type: "Text", visible: true, required: false },
      { label: "Institution Name", key: "institutionName", type: "Text", visible: true, required: true },
      { label: "Institution Address", key: "institutionAddress", type: "Address", visible: true, required: true },
      { label: "Classification", key: "classification", type: "Dropdown", visible: true, required: true },
      { label: "Representative Name", key: "representativeName", type: "Text", visible: true, required: true },
      { label: "Representative Designation", key: "representativeDesignation", type: "Text", visible: true, required: false },
      { label: "Sex", key: "sex", type: "Dropdown", visible: true, required: false },
      { label: "Name of Staff", key: "nameOfStaff", type: "Text", visible: true, required: false },
      { label: "Actions", key: "actions", type: "Action Buttons", visible: true, required: false },
    ],
    formFields: [
      { id: "unitCenter", label: "Unit/Center", key: "unitCenter", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "nameOfTechnologyTransferred", label: "Name of Knowledge/Technology Transferred", key: "nameOfTechnologyTransferred", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "technologyGenerator", label: "Technology Generator", key: "technologyGenerator", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "modeOfTransfer", label: "Mode of Transfer", key: "modeOfTransfer", type: "Dropdown", showAdd: true, showEdit: true, required: true },
      { id: "isDostDevelopedFunded", label: "DOST-developed/funded", key: "isDostDevelopedFunded", type: "Yes/No", showAdd: true, showEdit: true, required: false },
      { id: "dateTransferred", label: "Date Transferred", key: "dateTransferred", type: "Date", showAdd: true, showEdit: true, required: true },
      { id: "activityTitle", label: "Activity Title", key: "activityTitle", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "activityDate", label: "Activity Date", key: "activityDate", type: "Date", showAdd: true, showEdit: true, required: false },
      { id: "activityVenue", label: "Activity Venue", key: "activityVenue", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "institutionName", label: "Institution Name", key: "institutionName", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "institutionAddress", label: "Institution Address", key: "institutionAddress", type: "Address", showAdd: true, showEdit: true, required: true },
      { id: "classification", label: "Classification", key: "classification", type: "Dropdown", showAdd: true, showEdit: true, required: true },
      { id: "representativeName", label: "Representative Name", key: "representativeName", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "representativeDesignation", label: "Representative Designation", key: "representativeDesignation", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "sex", label: "Sex", key: "sex", type: "Dropdown", showAdd: true, showEdit: true, required: false },
      { id: "nameOfStaff", label: "Name of Staff", key: "nameOfStaff", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "quarter", label: "Quarter", key: "quarter", type: "Hidden / Auto From Date", showAdd: false, showEdit: false, required: false },
    ],
    dropdowns: { "Mode of Transfer": ["Commercialization", "Extension", "Public Good"], Classification: ["Individual", "MSME/Firm", "Academe", "LGU", "Cooperative/Association"], Sex: ["M", "F"], Quarter: ["1Q", "2Q", "3Q", "4Q"] },
    sampleRows: [{ "No.": "1", Quarter: "1Q", "Unit/Center": "DOST-PANGASINAN", "Name of Knowledge/Technology Transferred": "Sample Technology", "Technology Generator": "DOST", "Mode of Transfer": "Extension", "DOST-developed/funded": "YES", "Date Transferred": "2026-03-05", "Activity Title": "Technology Rollout Activity", "Activity Date": "2026-03-05", "Activity Venue": "Urdaneta", "Institution Name": "ABC Food Products", "Institution Address": "Urdaneta City, Pangasinan", Classification: "MSME/Firm", "Representative Name": "Juan Dela Cruz", "Representative Designation": "Owner", Sex: "M", "Name of Staff": "DOST Staff", Actions: "View / Edit / Delete" }],
  },

  "Tech Training": {
    columns: [
      { label: "No.", key: "no", type: "Auto Number", visible: true, required: false },
      { label: "Program", key: "program", type: "Dropdown", visible: true, required: true },
      { label: "Province", key: "province", type: "Text", visible: true, required: false },
      { label: "Date", key: "dateRange", type: "Date Range", visible: true, required: true },
      { label: "Venue/Address", key: "venueAddress", type: "Address", visible: true, required: true },
      { label: "Coordinates", key: "coordinates", type: "Auto / Read Only", visible: true, required: false },
      { label: "Title", key: "title", type: "Text", visible: true, required: true },
      { label: "No. of Firms", key: "noOfFirms", type: "Number", visible: true, required: false },
      { label: "Female", key: "totalFemale", type: "Auto / Computed", visible: true, required: false },
      { label: "Male", key: "totalMale", type: "Auto / Computed", visible: true, required: false },
      { label: "Total Participants", key: "participantsTotal", type: "Auto / Computed", visible: true, required: false },
      { label: "Name of Staff", key: "staffName", type: "Text", visible: true, required: false },
      { label: "Trainor/Affiliation", key: "trainorAffiliation", type: "Text", visible: true, required: false },
      { label: "Program/Project/Unit", key: "programProjectUnit", type: "Text", visible: true, required: false },
      { label: "DOST Cost", key: "costDost", type: "Currency", visible: true, required: false },
      { label: "Partner Cost", key: "costPartnerAgency", type: "Currency", visible: true, required: false },
      { label: "Total Cost", key: "costTotal", type: "Auto / Computed", visible: true, required: false },
      { label: "Actions", key: "actions", type: "Action Buttons", visible: true, required: false },
    ],
    formFields: [
      { id: "program", label: "Program", key: "program", type: "Dropdown", showAdd: true, showEdit: true, required: true },
      { id: "province", label: "Province", key: "province", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "startDate", label: "Start Date", key: "startDate", type: "Date", showAdd: true, showEdit: true, required: true },
      { id: "endDate", label: "End Date", key: "endDate", type: "Date", showAdd: true, showEdit: true, required: false },
      { id: "title", label: "Title", key: "title", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "venueAddress", label: "Venue/Address", key: "venueAddress", type: "Address", showAdd: true, showEdit: true, required: true },
      { id: "noOfFirms", label: "No. of Firms", key: "noOfFirms", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "participantsFemale", label: "Participants - Female", key: "participantsFemale", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "participantsMale", label: "Participants - Male", key: "participantsMale", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "seniorFemale", label: "Senior Citizen - Female", key: "seniorFemale", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "seniorMale", label: "Senior Citizen - Male", key: "seniorMale", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "ipFemale", label: "IP - Female", key: "ipFemale", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "ipMale", label: "IP - Male", key: "ipMale", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "fourPsFemale", label: "4Ps - Female", key: "fourPsFemale", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "fourPsMale", label: "4Ps - Male", key: "fourPsMale", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "pwdFemale", label: "PWD - Female", key: "pwdFemale", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "pwdMale", label: "PWD - Male", key: "pwdMale", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "firmsSucsHeisLgusCount", label: "Firms / SUCs / HEIs / LGUs Count", key: "firmsSucsHeisLgusCount", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "firmsAssociationsList", label: "Firms / Associations List", key: "firmsAssociationsList", type: "Textarea", showAdd: true, showEdit: true, required: false },
      { id: "trainorAffiliation", label: "Trainor/Affiliation", key: "trainorAffiliation", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "programProjectUnit", label: "Program/Project/Unit", key: "programProjectUnit", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "costDost", label: "DOST Cost", key: "costDost", type: "Currency", showAdd: true, showEdit: true, required: false },
      { id: "costPartnerAgency", label: "Partner Agency Cost", key: "costPartnerAgency", type: "Currency", showAdd: true, showEdit: true, required: false },
      { id: "staffName", label: "Name of Staff", key: "staffName", type: "Text", showAdd: true, showEdit: true, required: false },
    ],
    dropdowns: { Program: ["Waste Analysis and Characterization Study (WACS)", "Good Manufacturing Practices (cGMP)", "Food Safety", "Bread and Fruit Processing", "Environmental Protection and Conservation", "Disaster Risk Reduction and Management", "Association Management"], Province: ["PANGASINAN"], Month: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], District: ["District 1", "District 2", "District 3", "District 4", "District 5", "District 6"] },
    sampleRows: [{ "No.": "1", Program: "Food Safety", Province: "PANGASINAN", Date: "2026-02-11 to 2026-02-12", "Venue/Address": "Dagupan City, Pangasinan", Coordinates: "16.04, 120.33", Title: "Food Safety Training", "No. of Firms": "5", Female: "25", Male: "20", "Total Participants": "45", "Name of Staff": "DOST Staff", "Trainor/Affiliation": "DOST / Resource Speaker", "Program/Project/Unit": "SETUP", "DOST Cost": "₱10,000.00", "Partner Cost": "₱5,000.00", "Total Cost": "₱15,000.00", Actions: "View / Edit / Delete" }],
  },

  TACS: {
    columns: [
      { label: "No.", key: "no", type: "Auto Number", visible: true, required: false },
      { label: "Type of Consultancy", key: "typeOfConsultancy", type: "Dropdown", visible: true, required: true },
      { label: "Date of Engagement", key: "dateOfEngagement", type: "Date", visible: true, required: true },
      { label: "Name of Expert/Institution", key: "expertInstitution", type: "Text", visible: true, required: false },
      { label: "Name of Customer", key: "customerName", type: "Text", visible: true, required: true },
      { label: "Sex", key: "sex", type: "Dropdown", visible: true, required: false },
      { label: "Venue/Address of Customer", key: "customerAddressText", type: "Address", visible: true, required: true },
      { label: "Coordinates", key: "coordinates", type: "Auto / Read Only", visible: true, required: false },
      { label: "No. of Advice", key: "adviceCount", type: "Number", visible: true, required: true },
      { label: "Means of Verification", key: "meansOfVerification", type: "Link / File", visible: true, required: false },
      { label: "Name of Staff", key: "staffName", type: "Text", visible: true, required: false },
      { label: "Photos", key: "photos", type: "Photo Upload", visible: true, required: false },
      { label: "Actions", key: "actions", type: "Action Buttons", visible: true, required: false },
    ],
    formFields: [
      { id: "typeOfConsultancy", label: "Type of Consultancy", key: "typeOfConsultancy", type: "Dropdown", showAdd: true, showEdit: true, required: true },
      { id: "dateOfEngagement", label: "Date of Engagement", key: "dateOfEngagement", type: "Date", showAdd: true, showEdit: true, required: true },
      { id: "expertInstitution", label: "Name of Expert/Institution", key: "expertInstitution", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "customerName", label: "Name of Customer", key: "customerName", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "sex", label: "Sex", key: "sex", type: "Dropdown", showAdd: true, showEdit: true, required: false },
      { id: "customerAddressText", label: "Venue/Address of Customer", key: "customerAddressText", type: "Address", showAdd: true, showEdit: true, required: true },
      { id: "adviceCount", label: "No. of Advice", key: "adviceCount", type: "Number", showAdd: true, showEdit: true, required: true },
      { id: "meansOfVerification", label: "Means of Verification", key: "meansOfVerification", type: "Link / File", showAdd: true, showEdit: true, required: false },
      { id: "staffName", label: "Name of Staff", key: "staffName", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "photos", label: "Photos", key: "photos", type: "Photo Upload", showAdd: true, showEdit: true, required: false },
    ],
    dropdowns: { "Type of Consultancy": ["Plant Layout", "Simple TACS", "Food Safety Assessment", "Cleaner Production", "Energy Audit"], Sex: ["M", "F", "N/A"], Month: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], District: ["District 1", "District 2", "District 3", "District 4", "District 5", "District 6"] },
    sampleRows: [{ "No.": "1", "Type of Consultancy": "Plant Layout", "Date of Engagement": "2026-03-08", "Name of Expert/Institution": "DOST Expert", "Name of Customer": "ABC Food Products", Sex: "F", "Venue/Address of Customer": "Urdaneta City, Pangasinan", Coordinates: "15.97, 120.57", "No. of Advice": "1", "Means of Verification": "MOV Link", "Name of Staff": "DOST Staff", Photos: "1", Actions: "View / Edit / Delete" }],
  },

  "Package & Labeling": {
    columns: [
      { label: "No.", key: "no", type: "Auto Number", visible: true, required: false },
      { label: "Province", key: "province", type: "Text", visible: true, required: false },
      { label: "Name of Product", key: "products", type: "Nested Product List", visible: true, required: false },
      { label: "Type of Intervention", key: "typeOfIntervention", type: "Dropdown", visible: true, required: true },
      { label: "Size/Variant/Packaging Type", key: "sizeVariant", type: "Text", visible: true, required: true },
      { label: "No. of Packaging Materials Provided", key: "packagingMaterialsProvided", type: "Number", visible: true, required: true },
      { label: "Date Completed/Executed", key: "dateCompleted", type: "Date", visible: true, required: true },
      { label: "Customer Name", key: "customerName", type: "Text", visible: true, required: true },
      { label: "Sex", key: "sex", type: "Dropdown", visible: true, required: false },
      { label: "Firm/Institution", key: "firmName", type: "Text", visible: true, required: true },
      { label: "Address / Venue", key: "address", type: "Address", visible: true, required: true },
      { label: "Means of Verification", key: "meansOfVerification", type: "Link / File", visible: true, required: false },
      { label: "Name of Staff", key: "nameOfStaff", type: "Text", visible: true, required: false },
      { label: "Remarks", key: "remarks", type: "Textarea", visible: true, required: false },
      { label: "Photo Count", key: "photos", type: "Photo Upload", visible: true, required: false },
      { label: "Quarter", key: "quarter", type: "Auto / Read Only", visible: true, required: false },
      { label: "Actions", key: "actions", type: "Action Buttons", visible: true, required: false },
    ],
    formFields: [
      { id: "dateCompleted", label: "Date Completed/Executed", key: "dateCompleted", type: "Date", showAdd: true, showEdit: true, required: true },
      { id: "typeOfIntervention", label: "Type of Intervention", key: "typeOfIntervention", type: "Dropdown", showAdd: true, showEdit: true, required: true },
      { id: "products", label: "Name of Product", key: "products", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "sizeVariant", label: "Size/Variant/Packaging Type", key: "sizeVariant", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "packagingMaterialsProvided", label: "No. of Packaging Materials Provided", key: "packagingMaterialsProvided", type: "Number", showAdd: true, showEdit: true, required: true },
      { id: "customerName", label: "Customer Name", key: "customerName", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "sex", label: "Sex", key: "sex", type: "Dropdown", showAdd: true, showEdit: true, required: false },
      { id: "firmName", label: "Firm/Institution", key: "firmName", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "address", label: "Address / Venue", key: "address", type: "Address", showAdd: true, showEdit: true, required: true },
      { id: "meansOfVerification", label: "Means of Verification", key: "meansOfVerification", type: "Link / File", showAdd: true, showEdit: true, required: false },
      { id: "nameOfStaff", label: "Name of Staff", key: "nameOfStaff", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "remarks", label: "Remarks", key: "remarks", type: "Textarea", showAdd: true, showEdit: true, required: false },
      { id: "photos", label: "Photos", key: "photos", type: "Photo Upload", showAdd: true, showEdit: true, required: false },
      { id: "quarter", label: "Quarter", key: "quarter", type: "Hidden / Auto From Date", showAdd: false, showEdit: false, required: false },
    ],
    dropdowns: { "Type of Intervention": ["Label Design", "Packaging Execution", "Packaging Materials"], Sex: ["M", "F", "N/A"], Quarter: ["1Q", "2Q", "3Q", "4Q"] },
    sampleRows: [{ "No.": "1", Province: "Pangasinan", "Name of Product": "Sample Product", "Type of Intervention": "Label Design", "Size/Variant/Packaging Type": "Sticker label", "No. of Packaging Materials Provided": "100", "Date Completed/Executed": "2026-02-18", "Customer Name": "Juan Dela Cruz", Sex: "M", "Firm/Institution": "ABC Food Products", "Address / Venue": "Urdaneta City, Pangasinan", "Means of Verification": "MOV Link", "Name of Staff": "DOST Staff", Remarks: "Sample only", "Photo Count": "1", Quarter: "1Q", Actions: "View / Edit / Delete" }],
  },

  "Tech Promo": {
    columns: [
      { label: "No.", key: "no", type: "Auto Number", visible: true, required: false },
      { label: "Project", key: "project", type: "Dropdown", visible: true, required: false },
      { label: "Activity Date", key: "activityDate", type: "Date", visible: true, required: true },
      { label: "Technology Promoted", key: "technologyPromoted", type: "Text", visible: true, required: true },
      { label: "Technology Generator", key: "technologyGenerator", type: "Text", visible: true, required: true },
      { label: "Mode of Promotion", key: "modeOfPromotion", type: "Dropdown", visible: true, required: true },
      { label: "Activity Title", key: "activityTitle", type: "Text", visible: true, required: true },
      { label: "Activity Venue/Address", key: "activityVenueAddress", type: "Address", visible: true, required: true },
      { label: "Coordinates", key: "coordinates", type: "Auto / Read Only", visible: true, required: false },
      { label: "Customer/Participant", key: "customerName", type: "Text", visible: true, required: true },
      { label: "Customer Address", key: "customerAddress", type: "Text", visible: true, required: true },
      { label: "Sex", key: "sex", type: "Dropdown", visible: true, required: false },
      { label: "Name of Staff", key: "staffName", type: "Text", visible: true, required: true },
      { label: "Means of Verification", key: "meansOfVerification", type: "Link / File", visible: true, required: false },
      { label: "Source", key: "sourceModule", type: "Text", visible: true, required: false },
      { label: "Photos", key: "photos", type: "Photo Upload", visible: true, required: false },
      { label: "Actions", key: "actions", type: "Action Buttons", visible: true, required: false },
    ],
    formFields: [
      { id: "project", label: "Project", key: "project", type: "Dropdown", showAdd: true, showEdit: true, required: false },
      { id: "activityDate", label: "Activity Date", key: "activityDate", type: "Date", showAdd: true, showEdit: true, required: true },
      { id: "technologyPromoted", label: "Technology Promoted", key: "technologyPromoted", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "technologyGenerator", label: "Technology Generator", key: "technologyGenerator", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "modeOfPromotion", label: "Mode of Promotion", key: "modeOfPromotion", type: "Dropdown", showAdd: true, showEdit: true, required: true },
      { id: "activityTitle", label: "Activity Title", key: "activityTitle", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "activityVenueAddress", label: "Activity Venue/Address", key: "activityVenueAddress", type: "Address", showAdd: true, showEdit: true, required: true },
      { id: "customerName", label: "Customer/Participant", key: "customerName", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "customerAddress", label: "Customer/Participant Address", key: "customerAddress", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "sex", label: "Sex", key: "sex", type: "Dropdown", showAdd: true, showEdit: true, required: false },
      { id: "meansOfVerification", label: "Means of Verification", key: "meansOfVerification", type: "Link / File", showAdd: true, showEdit: true, required: false },
      { id: "staffName", label: "Name of Staff", key: "staffName", type: "Text", showAdd: true, showEdit: true, required: true },
      { id: "photos", label: "Photos", key: "photos", type: "Photo Upload", showAdd: true, showEdit: true, required: false },
    ],
    dropdowns: { Project: ["Setup", "CEST", "SSCP"], "Mode of Promotion": ["TechnoTransfer Day", "Forum", "Seminar", "Training", "Exhibit", "Caravan", "FGD", "Brochure", "Walk-in customers", "Social Media", "Interviews"], Sex: ["M", "F", "N/A"], Month: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] },
    sampleRows: [{ "No.": "1", Project: "Setup", "Activity Date": "2026-02-14", "Technology Promoted": "Sample Technology", "Technology Generator": "DOST", "Mode of Promotion": "Social Media", "Activity Title": "Technology Promotion Activity", "Activity Venue/Address": "Urdaneta City, Pangasinan", Coordinates: "15.97, 120.57", "Customer/Participant": "Juan Dela Cruz", "Customer Address": "Pangasinan", Sex: "N/A", "Name of Staff": "DOST Staff", "Means of Verification": "MOV Link", Source: "Manual", Photos: "1", Actions: "View / Edit / Delete" }],
  },

  "S&T Promo": {
    columns: [
      { label: "No.", key: "no", type: "Auto Number", visible: true, required: false },
      { label: "Entry Mode", key: "entryMode", type: "Dropdown", visible: true, required: true },
      { label: "Date", key: "date", type: "Date", visible: true, required: true },
      { label: "Project Title", key: "projectTitle", type: "Text", visible: true, required: false },
      { label: "Activity Type", key: "activityType", type: "Dropdown", visible: true, required: true },
      { label: "Regional", key: "regional", type: "Number", visible: true, required: false },
      { label: "Provincial", key: "provincial", type: "Number", visible: true, required: false },
      { label: "City/Municipality", key: "cityMunicipality", type: "Number", visible: true, required: false },
      { label: "Total Promotional Activities", key: "totalPromotionalActivities", type: "Auto / Computed", visible: true, required: false },
      { label: "Male", key: "male", type: "Number", visible: true, required: false },
      { label: "Female", key: "female", type: "Number", visible: true, required: false },
      { label: "Total Participants", key: "totalParticipants", type: "Auto / Computed", visible: true, required: false },
      { label: "People Reached", key: "peopleReached", type: "Number", visible: true, required: false },
      { label: "Views", key: "views", type: "Number", visible: true, required: false },
      { label: "Reaction", key: "reaction", type: "Number", visible: true, required: false },
      { label: "Comment", key: "comment", type: "Number", visible: true, required: false },
      { label: "Share", key: "share", type: "Number", visible: true, required: false },
      { label: "Total Engagements", key: "totalEngagements", type: "Auto / Computed", visible: true, required: false },
      { label: "Means of Verification", key: "meansOfVerification", type: "Link / File", visible: true, required: false },
      { label: "Address / Venue", key: "address", type: "Address", visible: true, required: false },
      { label: "Name of Staff", key: "staffName", type: "Text", visible: true, required: false },
      { label: "Remarks", key: "remarks", type: "Textarea", visible: true, required: false },
      { label: "Actions", key: "actions", type: "Action Buttons", visible: true, required: false },
    ],
    formFields: [
      { id: "entryMode", label: "Entry Mode", key: "entryMode", type: "Dropdown", showAdd: true, showEdit: true, required: true },
      { id: "date", label: "Date", key: "date", type: "Date", showAdd: true, showEdit: true, required: true },
      { id: "projectTitle", label: "Project Title", key: "projectTitle", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "activityType", label: "Activity Type", key: "activityType", type: "Dropdown", showAdd: true, showEdit: true, required: true },
      { id: "regional", label: "Regional", key: "regional", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "provincial", label: "Provincial", key: "provincial", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "cityMunicipality", label: "City/Municipality", key: "cityMunicipality", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "male", label: "Male", key: "male", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "female", label: "Female", key: "female", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "peopleReached", label: "People Reached", key: "peopleReached", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "views", label: "Views", key: "views", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "reaction", label: "Reaction", key: "reaction", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "comment", label: "Comment", key: "comment", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "share", label: "Share", key: "share", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "meansOfVerification", label: "Means of Verification", key: "meansOfVerification", type: "Link / File", showAdd: true, showEdit: true, required: false },
      { id: "address", label: "Address / Venue", key: "address", type: "Address", showAdd: true, showEdit: true, required: false },
      { id: "staffName", label: "Name of Staff", key: "staffName", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "remarks", label: "Remarks", key: "remarks", type: "Textarea", showAdd: true, showEdit: true, required: false },
    ],
    dropdowns: { "Entry Mode": ["ONLINE", "ONSITE"], "Online Activity Type": ["Press Releases", "ATM posts, Infographics", "TV/radio Interviews", "Press conference", "Webinars", "Others"], "Onsite Activity Type": ["FGD", "Interview", "Meeting", "Forum", "Seminar", "Workshop", "Webinar", "Others"], Month: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] },
    sampleRows: [{ "No.": "1", "Entry Mode": "ONLINE", Date: "2026-04-01", "Project Title": "S&T Promo Campaign", "Activity Type": "ATM posts, Infographics", Regional: "1", Provincial: "2", "City/Municipality": "3", "Total Promotional Activities": "6", Male: "0", Female: "0", "Total Participants": "0", "People Reached": "4200", Views: "5100", Reaction: "80", Comment: "10", Share: "20", "Total Engagements": "110", "Means of Verification": "MOV Link", "Address / Venue": "Online", "Name of Staff": "DOST Staff", Remarks: "Sample only", Actions: "View / Edit / Delete" }],
  },

  Calibration: {
    columns: [
      { label: "No.", key: "no", type: "Auto Number", visible: true, required: false },
      { label: "Category", key: "category", type: "Dropdown", visible: true, required: true },
      { label: "Date", key: "date", type: "Date", visible: true, required: true },
      { label: "Type of Samples", key: "typeOfSample", type: "Dropdown", visible: true, required: true },
      { label: "Type of Test / Analysis / Calibration", key: "testType", type: "Auto / Read Only", visible: true, required: false },
      { label: "No. of Sample", key: "noOfSample", type: "Number", visible: true, required: true },
      { label: "Range / MC Breakdown", key: "range", type: "Dropdown / Breakdown", visible: true, required: false },
      { label: "Cost", key: "cost", type: "Currency", visible: true, required: false },
      { label: "Fees Collected", key: "feesCollected", type: "Currency", visible: true, required: false },
      { label: "Venue/Address", key: "address", type: "Address", visible: true, required: true },
      { label: "Female", key: "female", type: "Number", visible: true, required: false },
      { label: "Male", key: "male", type: "Number", visible: true, required: false },
      { label: "Total Customers", key: "totalCustomers", type: "Auto / Computed", visible: true, required: false },
      { label: "No. of Firms", key: "noOfFirms", type: "Number", visible: true, required: false },
      { label: "No. of New Firms", key: "noOfNewFirms", type: "Number", visible: true, required: false },
      { label: "Age Range", key: "ageRange", type: "Text", visible: true, required: false },
      { label: "PWD", key: "pwd", type: "Number", visible: true, required: false },
      { label: "IP", key: "ip", type: "Number", visible: true, required: false },
      { label: "SC", key: "sc", type: "Number", visible: true, required: false },
      { label: "4Ps", key: "fourPs", type: "Number", visible: true, required: false },
      { label: "Name of Staff", key: "nameOfStaff", type: "Text", visible: true, required: false },
      { label: "Remarks", key: "remarks", type: "Textarea", visible: true, required: false },
      { label: "Actions", key: "actions", type: "Action Buttons", visible: true, required: false },
    ],
    formFields: [
      { id: "category", label: "Category", key: "category", type: "Dropdown", showAdd: true, showEdit: true, required: true },
      { id: "date", label: "Date", key: "date", type: "Date", showAdd: true, showEdit: true, required: true },
      { id: "typeOfSample", label: "Type of Samples", key: "typeOfSample", type: "Dropdown", showAdd: true, showEdit: true, required: true },
      { id: "testType", label: "Type of Test / Analysis / Calibration", key: "testType", type: "Hidden / Auto From Date", showAdd: false, showEdit: false, required: false },
      { id: "noOfSample", label: "No. of Sample", key: "noOfSample", type: "Number", showAdd: true, showEdit: true, required: true },
      { id: "range", label: "Range", key: "range", type: "Dropdown", showAdd: true, showEdit: true, required: false },
      { id: "cost", label: "Cost", key: "cost", type: "Currency", showAdd: true, showEdit: true, required: false },
      { id: "feesCollected", label: "Fees Collected", key: "feesCollected", type: "Currency", showAdd: true, showEdit: true, required: false },
      { id: "address", label: "Venue/Address", key: "address", type: "Address", showAdd: true, showEdit: true, required: true },
      { id: "female", label: "Female", key: "female", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "male", label: "Male", key: "male", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "totalCustomers", label: "Total Customers", key: "totalCustomers", type: "Hidden / Computed", showAdd: false, showEdit: false, required: false },
      { id: "noOfFirms", label: "No. of Firms", key: "noOfFirms", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "noOfNewFirms", label: "No. of New Firms", key: "noOfNewFirms", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "ageRange", label: "Age Range", key: "ageRange", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "pwd", label: "PWD", key: "pwd", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "ip", label: "IP", key: "ip", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "sc", label: "SC", key: "sc", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "fourPs", label: "4Ps", key: "fourPs", type: "Number", showAdd: true, showEdit: true, required: false },
      { id: "nameOfStaff", label: "Name of Staff", key: "nameOfStaff", type: "Text", showAdd: true, showEdit: true, required: false },
      { id: "remarks", label: "Remarks", key: "remarks", type: "Textarea", showAdd: true, showEdit: true, required: false },
    ],
    dropdowns: { Category: ["PAYING", "NON-PAYING"], "Type of Samples": ["Weighing Scale", "Bucket"], "MC Range": ["<100 Kg", ">=100 Kg"], "Test Type": ["Mass Calibration", "Volume Calibration"], Month: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] },
    sampleRows: [{ "No.": "1", Category: "PAYING", Date: "2026-03-12", "Type of Samples": "Weighing Scale", "Type of Test / Analysis / Calibration": "Mass Calibration", "No. of Sample": "3", "Range / MC Breakdown": "<100 Kg (2), >=100 Kg (1)", Cost: "₱500.00", "Fees Collected": "₱1,500.00", "Venue/Address": "Urdaneta City, Pangasinan", Female: "2", Male: "1", "Total Customers": "3", "No. of Firms": "1", "No. of New Firms": "1", "Age Range": "25-40", PWD: "0", IP: "0", SC: "0", "4Ps": "0", "Name of Staff": "DOST Staff", Remarks: "Sample only", Actions: "View / Edit / Delete" }],
  },
};

const TABLE_NAME_MAP = {
  "Activities Table": "activities",
  "IEC Materials": "iec_materials",
  "Collaborations": "collaborations",
};

function normalizeFieldFromApi(field) {
  return {
    id: field.id,
    label: field.fieldLabel,
    key: field.fieldKey,
    type: field.fieldType,
    visible: field.isVisible !== false,
    required: field.isRequired === true,
    showAdd: field.showAdd === true,
    showEdit: field.showEdit === true,
    isSystemField: field.isSystemField === true,
    sortOrder: field.sortOrder || 0,
  };
}

function buildConfigsFromApi(apiModules, apiDropdowns) {
  const nextConfigs = { ...DEFAULT_CONFIGS };

  (apiModules || []).forEach((moduleItem) => {
    const moduleName = moduleItem.moduleName;
    const existingModuleConfig = DEFAULT_CONFIGS[moduleName] || {};
    const tables = moduleItem.tables || [];

    if (moduleName === "DRRM") {
      const drrmTables = {};

      tables.forEach((tableItem) => {
        const displayName = tableItem.displayName || tableItem.tableName;
        const existingTableConfig =
          existingModuleConfig.tables?.[displayName] ||
          existingModuleConfig.tables?.["Activities Table"] ||
          {};

        const fields = (tableItem.fields || [])
          .slice()
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
          .map(normalizeFieldFromApi);

        const dropdowns = {};

        (apiDropdowns || [])
          .filter((d) => Number(d.tableId) === Number(tableItem.id))
          .forEach((dropdown) => {
            dropdowns[dropdown.dropdownName] = (dropdown.options || [])
              .slice()
              .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
              .map((option) => option.optionValue);
          });

        drrmTables[displayName] = {
          ...existingTableConfig,
          columns: fields.map((field) => ({
            label: field.label,
            key: field.key,
            type: field.type,
            visible: field.visible,
            required: field.required,
            id: field.id,
            isSystemField: field.isSystemField,
          })),
          formFields: fields.map((field) => ({
            id: field.id,
            label: field.label,
            key: field.key,
            type: field.type,
            showAdd: field.showAdd,
            showEdit: field.showEdit,
            required: field.required,
            isSystemField: field.isSystemField,
          })),
          dropdowns: Object.keys(dropdowns).length > 0 ? dropdowns : existingTableConfig.dropdowns || {},
          settings: tableItem.settings || existingTableConfig.settings || {},
          sampleRows: existingTableConfig.sampleRows || [],
          tableId: tableItem.id,
          moduleId: moduleItem.id,
          tableName: tableItem.tableName,
          displayName,
        };
      });

      nextConfigs[moduleName] = {
        ...existingModuleConfig,
        tables: Object.keys(drrmTables).length > 0 ? drrmTables : existingModuleConfig.tables,
      };

      return;
    }

    const mainTable = tables[0];
    if (!mainTable) return;

    const fields = (mainTable.fields || [])
      .slice()
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map(normalizeFieldFromApi);

    const dropdowns = {};
    (apiDropdowns || [])
      .filter((d) => Number(d.tableId) === Number(mainTable.id))
      .forEach((dropdown) => {
        dropdowns[dropdown.dropdownName] = (dropdown.options || [])
          .slice()
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
          .map((option) => option.optionValue);
      });

    nextConfigs[moduleName] = {
      ...existingModuleConfig,
      columns: fields.map((field) => ({
        label: field.label,
        key: field.key,
        type: field.type,
        visible: field.visible,
        required: field.required,
        id: field.id,
        isSystemField: field.isSystemField,
      })),
      formFields: fields.map((field) => ({
        id: field.id,
        label: field.label,
        key: field.key,
        type: field.type,
        showAdd: field.showAdd,
        showEdit: field.showEdit,
        required: field.required,
        isSystemField: field.isSystemField,
      })),
      dropdowns: Object.keys(dropdowns).length > 0 ? dropdowns : existingModuleConfig.dropdowns || {},
      settings: mainTable.settings || existingModuleConfig.settings || {},
      sampleRows: existingModuleConfig.sampleRows || [],
      tableId: mainTable.id,
      moduleId: moduleItem.id,
      tableName: mainTable.tableName,
      displayName: mainTable.displayName,
    };
  });

  return nextConfigs;
}

function makeFieldKey(label) {
  return label
    .trim()
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .replace(/\s+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^(.)/, (_, chr) => chr.toLowerCase());
}

function Badge({ children, tone = "default" }) {
  const colors = {
    default: { background: "#eef2ff", color: "#3730a3" },
    green: { background: "#dcfce7", color: "#166534" },
    red: { background: "#fee2e2", color: "#991b1b" },
    gray: { background: "#f3f4f6", color: "#374151" },
    amber: { background: "#fef3c7", color: "#92400e" },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 9px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        ...colors[tone],
      }}
    >
      {children}
    </span>
  );
}

function SectionCard({ title, description, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={styles.sectionCard}>
      <button type="button" onClick={() => setOpen(!open)} style={styles.sectionHeader}>
        <div>
          <div style={styles.sectionTitle}>{title}</div>
          <div style={styles.sectionDescription}>{description}</div>
        </div>
        <div style={styles.chevron}>{open ? "−" : "+"}</div>
      </button>

      {open && <div style={styles.sectionBody}>{children}</div>}
    </div>
  );
}

function SimpleTable({ columns, rows }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} style={styles.th}>
                {col}
              </th>
            ))}
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td style={styles.td} colSpan={columns.length + 1}>
                No temporary data.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index}>
                {columns.map((col) => (
                  <td key={col} style={styles.td}>
                    {String(row[col] ?? "")}
                  </td>
                ))}
                <td style={styles.td}>
                  <div style={styles.actionGroup}>
                    <button style={styles.smallBtn}>View</button>
                    <button style={styles.smallBtn}>Edit</button>
                    <button style={{ ...styles.smallBtn, ...styles.dangerBtn }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function PreviewInput({ field, dropdownOptions }) {
  const commonStyle = styles.previewInput;

  if (!field.showAdd) return null;

  if (field.type === "Dropdown") {
    const options = dropdownOptions[field.label] || dropdownOptions[field.key] || ["Sample Option 1", "Sample Option 2"];

    return (
      <label style={styles.previewLabel}>
        {field.label} {field.required && <span style={styles.requiredMark}>*</span>}
        <select style={commonStyle}>
          <option>Select {field.label}</option>
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "Date") {
    return (
      <label style={styles.previewLabel}>
        {field.label} {field.required && <span style={styles.requiredMark}>*</span>}
        <input type="date" style={commonStyle} />
      </label>
    );
  }

  if (field.type === "Date Range") {
    return (
      <div style={styles.previewTwoCol}>
        <label style={styles.previewLabel}>
          {field.label} From {field.required && <span style={styles.requiredMark}>*</span>}
          <input type="date" style={commonStyle} />
        </label>
        <label style={styles.previewLabel}>
          {field.label} To
          <input type="date" style={commonStyle} />
        </label>
      </div>
    );
  }

  if (field.type === "Textarea") {
    return (
      <label style={styles.previewLabel}>
        {field.label} {field.required && <span style={styles.requiredMark}>*</span>}
        <textarea style={{ ...commonStyle, minHeight: 72, paddingTop: 10 }} placeholder={`Enter ${field.label.toLowerCase()}`} />
      </label>
    );
  }

  if (field.type === "Address") {
    return (
      <label style={styles.previewLabel}>
        {field.label} {field.required && <span style={styles.requiredMark}>*</span>}
        <button type="button" style={styles.addressPreviewBtn}>
          <span>Click to select address</span>
          <small>Select</small>
        </button>
      </label>
    );
  }

  if (field.type === "Currency") {
    return (
      <label style={styles.previewLabel}>
        {field.label} {field.required && <span style={styles.requiredMark}>*</span>}
        <input type="number" step="0.01" style={commonStyle} placeholder="0.00" />
      </label>
    );
  }

  if (field.type === "Number") {
    return (
      <label style={styles.previewLabel}>
        {field.label} {field.required && <span style={styles.requiredMark}>*</span>}
        <input type="number" style={commonStyle} placeholder={`Enter ${field.label.toLowerCase()}`} />
      </label>
    );
  }

  if (field.type === "Radio" || field.type === "Yes/No") {
    return (
      <div style={styles.previewLabel}>
        {field.label} {field.required && <span style={styles.requiredMark}>*</span>}
        <div style={styles.radioRow}>
          <label><input type="radio" name={field.key} /> Yes</label>
          <label><input type="radio" name={field.key} /> No</label>
        </div>
      </div>
    );
  }

  if (field.type === "Link / File") {
    return (
      <label style={styles.previewLabel}>
        {field.label} {field.required && <span style={styles.requiredMark}>*</span>}
        <input type="url" style={commonStyle} placeholder="Paste link or file URL" />
      </label>
    );
  }

  return (
    <label style={styles.previewLabel}>
      {field.label} {field.required && <span style={styles.requiredMark}>*</span>}
      <input type="text" style={commonStyle} placeholder={`Enter ${field.label.toLowerCase()}`} />
    </label>
  );
}

function AddModalPreview({ moduleName, fields, dropdowns }) {
  const visibleFields = fields.filter((field) => field.showAdd);

  return (
    <div style={styles.modalPreviewShell}>
      <div style={styles.modalPreview}>
        <div style={styles.modalPreviewHeader}>
          <strong>Add {moduleName === "Special Project" ? "Project" : moduleName}</strong>
          <button style={styles.modalCloseBtn}>×</button>
        </div>

        <div style={styles.modalPreviewBody}>
          <div style={styles.previewGrid}>
            {visibleFields.map((field) => (
              <PreviewInput key={field.id} field={field} dropdownOptions={dropdowns} />
            ))}
          </div>
        </div>

        <div style={styles.modalPreviewFooter}>
          <button style={styles.secondaryBtn}>Cancel</button>
          <button style={styles.primaryBtn}>Save</button>
        </div>
      </div>
    </div>
  );
}


function DeleteConfirmModal({ open, title, message, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div style={styles.deleteModalBackdrop} onClick={onCancel}>
      <div style={styles.deleteModal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.deleteModalHeader}>
          <div>
            <div style={styles.deleteModalTitle}>{title || "Confirm Delete"}</div>
            <div style={styles.deleteModalSub}>This action needs your confirmation.</div>
          </div>
          <button type="button" style={styles.deleteModalClose} onClick={onCancel}>✕</button>
        </div>

        <div style={styles.deleteModalBody}>
          <div style={styles.deleteIconCircle}>?</div>
          <div>
            <div style={styles.deleteMessage}>{message || "Are you sure you want to delete this?"}</div>
            <div style={styles.deleteHelpText}>Please review before deleting. Click Cancel if this was accidental.</div>
          </div>
        </div>

        <div style={styles.deleteModalFooter}>
          <button type="button" style={styles.btnCancelDelete} onClick={onCancel}>Cancel</button>
          <button type="button" style={styles.btnConfirmDelete} onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function TableManagement() {
  const [selectedModule, setSelectedModule] = useState("SETUP");
  const [selectedDrrmTable, setSelectedDrrmTable] = useState("Activities Table");
  const [configs, setConfigs] = useState(DEFAULT_CONFIGS);
  const [apiModules, setApiModules] = useState([]);
  const [apiDropdowns, setApiDropdowns] = useState([]);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [configError, setConfigError] = useState("");
  const [savingMessage, setSavingMessage] = useState("");
  const [selectedDropdown, setSelectedDropdown] = useState("");
  const [newOption, setNewOption] = useState("");
  const [newDropdownName, setNewDropdownName] = useState("");
  const [editingDropdownName, setEditingDropdownName] = useState("");
  const [editingDropdownValue, setEditingDropdownValue] = useState("");
  const [newField, setNewField] = useState({
    label: "",
    type: "Text",
    required: false,
    showAdd: true,
    showEdit: true,
  });
  const [savedFieldRows, setSavedFieldRows] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const openDeleteConfirm = ({ title, message, onConfirm }) => {
    setDeleteConfirm({
      open: true,
      title: title || "Confirm Delete",
      message: message || "Are you sure you want to delete this?",
      onConfirm,
    });
  };

  const closeDeleteConfirm = () => setDeleteConfirm(null);

  const runDeleteConfirm = async () => {
    const action = deleteConfirm?.onConfirm;
    closeDeleteConfirm();
    if (typeof action === "function") await action();
  };

  async function reloadTableManagementData() {
    setIsLoadingConfig(true);
    setConfigError("");

    try {
      const [configRes, dropdownRes] = await Promise.all([
        fetch(`${API_BASE}/table-management/config`),
        fetch(`${API_BASE}/table-management/dropdowns`),
      ]);

      if (!configRes.ok) {
        throw new Error(`Config API failed: ${configRes.status}`);
      }

      if (!dropdownRes.ok) {
        throw new Error(`Dropdown API failed: ${dropdownRes.status}`);
      }

      const configData = await configRes.json();
      const dropdownData = await dropdownRes.json();

      setApiModules(configData || []);
      setApiDropdowns(dropdownData || []);
      setConfigs(buildConfigsFromApi(configData || [], dropdownData || []));
    } catch (err) {
      console.error("Table Management API load error:", err);
      setConfigError("Hindi ma-load ang database config. Fallback muna sa default local config.");
      setConfigs(DEFAULT_CONFIGS);
    } finally {
      setIsLoadingConfig(false);
    }
  }

  useEffect(() => {
    reloadTableManagementData();
  }, []);

  function getActiveModuleMeta() {
    return apiModules.find((item) => item.moduleName === selectedModule);
  }

  function getActiveTableMeta() {
    const moduleMeta = getActiveModuleMeta();
    if (!moduleMeta) return null;

    if (selectedModule === "DRRM") {
      return (moduleMeta.tables || []).find((table) => table.displayName === selectedDrrmTable);
    }

    return (moduleMeta.tables || [])[0] || null;
  }

  function getActiveDropdownMeta(dropdownName = activeDropdown) {
    const tableMeta = getActiveTableMeta();
    if (!tableMeta) return null;

    return apiDropdowns.find(
      (dropdown) =>
        Number(dropdown.tableId) === Number(tableMeta.id) &&
        dropdown.dropdownName === dropdownName
    );
  }

  function getDropdownOptionMeta(dropdownName, optionValue) {
    const dropdownMeta = getActiveDropdownMeta(dropdownName);
    if (!dropdownMeta) return null;

    return (dropdownMeta.options || []).find((option) => option.optionValue === optionValue);
  }

  function setAutoSavedMessage(message = "Saved to database.") {
    setSavingMessage(message);
    window.clearTimeout(setAutoSavedMessage._timer);
    setAutoSavedMessage._timer = window.setTimeout(() => setSavingMessage(""), 2200);
  }

  function handleApiError(err) {
    console.error("Table Management save error:", err);
    setSavingMessage("Hindi na-save sa database. Check backend/API.");
  }

  async function handleSaveConfiguration() {
    const fieldsToSave = (config.formFields || [])
      .filter((field) => typeof field.id === "number" && !field.isSystemField)
      .map((field, index) => {
        const col = (config.columns || []).find(
          (item) => item.id === field.id || item.key === field.key
        );

        return {
          id: field.id,
          fieldLabel: field.label,
          fieldKey: field.key,
          fieldType: field.type,
          isRequired: field.required,
          isVisible: col?.visible !== false,
          showAdd: field.showAdd,
          showEdit: field.showEdit,
          sortOrder: index + 1,
          isSystemField: field.isSystemField,
        };
      });

    try {
      setSavingMessage("Saving configuration to database...");

      const res = await fetch(`${API_BASE}/table-management/config/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleName: selectedModule,
          tableName: selectedModule === "DRRM" ? selectedDrrmTable : "main",
          fields: fieldsToSave,
        }),
      });

      if (!res.ok) throw new Error(`Save config failed: ${res.status}`);

      await reloadTableManagementData();
      setAutoSavedMessage("Configuration saved to database.");
    } catch (err) {
      handleApiError(err);
    }
  }

  const rawConfig = configs[selectedModule];

  const config =
    selectedModule === "DRRM" && rawConfig?.tables
      ? rawConfig.tables[selectedDrrmTable] || rawConfig.tables["Activities Table"]
      : rawConfig;

  const dropdownNames = useMemo(() => {
    return Object.keys(config.dropdowns || {});
  }, [config]);

  const activeDropdown = selectedDropdown || dropdownNames[0] || "";

  const visibleColumns = config.columns
    .filter((col) => col.visible)
    .map((col) => col.label);

  function updateSelectedConfig(updater) {
    setConfigs((prev) => {
      if (selectedModule === "DRRM" && prev.DRRM?.tables) {
        const currentTableConfig =
          prev.DRRM.tables[selectedDrrmTable] || prev.DRRM.tables["Activities Table"];

        const nextTableConfig =
          typeof updater === "function" ? updater(currentTableConfig) : updater;

        return {
          ...prev,
          DRRM: {
            ...prev.DRRM,
            tables: {
              ...prev.DRRM.tables,
              [selectedDrrmTable]: nextTableConfig,
            },
          },
        };
      }

      const currentConfig = prev[selectedModule];
      const nextConfig = typeof updater === "function" ? updater(currentConfig) : updater;

      return {
        ...prev,
        [selectedModule]: nextConfig,
      };
    });
  }

  async function addDropdownOption() {
    const value = newOption.trim();
    if (!value || !activeDropdown) return;

    const dropdownMeta = getActiveDropdownMeta(activeDropdown);

    updateSelectedConfig((current) => {
      const currentOptions = current.dropdowns[activeDropdown] || [];

      if (currentOptions.some((item) => item.toLowerCase() === value.toLowerCase())) {
        return current;
      }

      return {
        ...current,
        dropdowns: {
          ...current.dropdowns,
          [activeDropdown]: [...currentOptions, value],
        },
      };
    });

    setNewOption("");

    if (!dropdownMeta?.id) return;

    try {
      const res = await fetch(`${API_BASE}/table-management/dropdown-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dropdownId: dropdownMeta.id,
          optionValue: value,
          displayOrder: (dropdownMeta.options || []).length + 1,
        }),
      });

      if (!res.ok) throw new Error(`Add dropdown option failed: ${res.status}`);

      await reloadTableManagementData();
      setAutoSavedMessage();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function deleteDropdownOption(optionToDelete) {
    const optionMeta = getDropdownOptionMeta(activeDropdown, optionToDelete);

    updateSelectedConfig((current) => {
      const currentOptions = current.dropdowns[activeDropdown] || [];

      return {
        ...current,
        dropdowns: {
          ...current.dropdowns,
          [activeDropdown]: currentOptions.filter((item) => item !== optionToDelete),
        },
      };
    });

    if (!optionMeta?.id) return;

    try {
      const res = await fetch(`${API_BASE}/table-management/dropdown-options/${optionMeta.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error(`Delete dropdown option failed: ${res.status}`);

      await reloadTableManagementData();
      setAutoSavedMessage();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function addDropdownList() {
    const name = newDropdownName.trim();
    if (!name) return;

    const moduleMeta = getActiveModuleMeta();
    const tableMeta = getActiveTableMeta();

    updateSelectedConfig((current) => {
      if (current.dropdowns[name]) return current;

      return {
        ...current,
        dropdowns: {
          ...current.dropdowns,
          [name]: [],
        },
      };
    });

    setSelectedDropdown(name);
    setNewDropdownName("");

    if (!moduleMeta?.id || !tableMeta?.id) return;

    try {
      const res = await fetch(`${API_BASE}/table-management/dropdowns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: moduleMeta.id,
          tableId: tableMeta.id,
          dropdownName: name,
          displayOrder: Object.keys(config.dropdowns || {}).length + 1,
        }),
      });

      if (!res.ok) throw new Error(`Add dropdown list failed: ${res.status}`);

      await reloadTableManagementData();
      setSelectedDropdown(name);
      setAutoSavedMessage();
    } catch (err) {
      handleApiError(err);
    }
  }

  function startRenameDropdownList(dropdownName) {
    setEditingDropdownName(dropdownName);
    setEditingDropdownValue(dropdownName);
  }

  async function saveRenameDropdownList(oldName) {
    const newName = editingDropdownValue.trim();
    if (!newName || newName === oldName) {
      setEditingDropdownName("");
      setEditingDropdownValue("");
      return;
    }

    const dropdownMeta = getActiveDropdownMeta(oldName);

    updateSelectedConfig((current) => {
      if (current.dropdowns[newName]) return current;

      const currentDropdowns = current.dropdowns;
      const nextDropdowns = {};

      Object.keys(currentDropdowns).forEach((key) => {
        nextDropdowns[key === oldName ? newName : key] = currentDropdowns[key];
      });

      return {
        ...current,
        dropdowns: nextDropdowns,
        formFields: current.formFields.map((field) =>
          field.label === oldName ? { ...field, label: newName } : field
        ),
      };
    });

    if (activeDropdown === oldName) {
      setSelectedDropdown(newName);
    }

    setEditingDropdownName("");
    setEditingDropdownValue("");

    if (!dropdownMeta?.id) return;

    try {
      const res = await fetch(`${API_BASE}/table-management/dropdowns/${dropdownMeta.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dropdownName: newName,
          displayOrder: dropdownMeta.displayOrder || 0,
        }),
      });

      if (!res.ok) throw new Error(`Rename dropdown failed: ${res.status}`);

      await reloadTableManagementData();
      setSelectedDropdown(newName);
      setAutoSavedMessage();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function deleteDropdownList(dropdownName) {
    const dropdownMeta = getActiveDropdownMeta(dropdownName);

    updateSelectedConfig((current) => {
      const nextDropdowns = { ...current.dropdowns };
      delete nextDropdowns[dropdownName];

      return {
        ...current,
        dropdowns: nextDropdowns,
      };
    });

    if (activeDropdown === dropdownName) {
      setSelectedDropdown("");
      setNewOption("");
    }

    if (!dropdownMeta?.id) return;

    try {
      const res = await fetch(`${API_BASE}/table-management/dropdowns/${dropdownMeta.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error(`Delete dropdown failed: ${res.status}`);

      await reloadTableManagementData();
      setAutoSavedMessage();
    } catch (err) {
      handleApiError(err);
    }
  }

  function getDropdownUsedIn(dropdownName) {
    const matchingFields = config.formFields
      .filter((field) => field.type === "Dropdown" && (field.label === dropdownName || field.key === dropdownName))
      .map((field) => field.label);

    if (matchingFields.length > 0) return matchingFields.join(", ");

    return "Available dropdown list";
  }

  function toggleColumnVisibility(columnKey) {
    updateSelectedConfig((current) => {
      return {
        ...current,
        columns: current.columns.map((col) =>
          col.key === columnKey ? { ...col, visible: !col.visible } : col
        ),
      };
    });
  }

  function selectModule(moduleName) {
    setSelectedModule(moduleName);
    if (moduleName === "DRRM") {
      setSelectedDrrmTable("Activities Table");
    }
    setSelectedDropdown("");
    setNewOption("");
    setNewDropdownName("");
    setEditingDropdownName("");
    setEditingDropdownValue("");
    setNewField({
      label: "",
      type: "Text",
      required: false,
      showAdd: true,
      showEdit: true,
    });
    setSavedFieldRows({});
  }

  async function updateField(fieldId, updates) {
    let updatedField = null;

    updateSelectedConfig((current) => {
      const nextFields = current.formFields.map((field) => {
        if (field.id !== fieldId) return field;
        updatedField = { ...field, ...updates };
        return updatedField;
      });

      return {
        ...current,
        formFields: nextFields,
        columns: current.columns.map((col) =>
          col.id === fieldId || col.key === updatedField?.key
            ? {
              ...col,
              label: updatedField?.label ?? col.label,
              type: updatedField?.type ?? col.type,
              required: updatedField?.required ?? col.required,
            }
            : col
        ),
      };
    });

    if (!updatedField || typeof fieldId !== "number" || updatedField.isSystemField) return;

    try {
      const res = await fetch(`${API_BASE}/table-management/fields/${fieldId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldLabel: updatedField.label,
          fieldKey: updatedField.key,
          fieldType: updatedField.type,
          isRequired: updatedField.required,
          isVisible: true,
          showAdd: updatedField.showAdd,
          showEdit: updatedField.showEdit,
          sortOrder: config.formFields.findIndex((field) => field.id === fieldId) + 1,
        }),
      });

      if (!res.ok) throw new Error(`Update field failed: ${res.status}`);

      setAutoSavedMessage();
    } catch (err) {
      handleApiError(err);
    }
  }

  async function saveFieldRow(fieldId) {
    const fieldToSave = config.formFields.find((field) => field.id === fieldId);
    if (!fieldToSave) return;

    const savedKey =
      selectedModule === "DRRM"
        ? `${selectedModule}:${selectedDrrmTable}:${fieldId}`
        : `${selectedModule}:${fieldId}`;

    setSavedFieldRows((prev) => ({
      ...prev,
      [savedKey]: true,
    }));

    window.setTimeout(() => {
      setSavedFieldRows((prev) => ({
        ...prev,
        [savedKey]: false,
      }));
    }, 1300);

    if (typeof fieldId !== "number" || fieldToSave.isSystemField) {
      setAutoSavedMessage("Saved in current view.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/table-management/fields/${fieldId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldLabel: fieldToSave.label,
          fieldKey: fieldToSave.key,
          fieldType: fieldToSave.type,
          isRequired: fieldToSave.required,
          isVisible: true,
          showAdd: fieldToSave.showAdd,
          showEdit: fieldToSave.showEdit,
          sortOrder: config.formFields.findIndex((field) => field.id === fieldId) + 1,
        }),
      });

      if (!res.ok) throw new Error(`Save field failed: ${res.status}`);

      setAutoSavedMessage("Field saved.");
    } catch (err) {
      handleApiError(err);
    }
  }

  async function deleteField(fieldId) {
    const fieldToDelete = config.formFields.find((field) => field.id === fieldId);
    if (fieldToDelete?.isSystemField) return;

    updateSelectedConfig((current) => ({
      ...current,
      formFields: current.formFields.filter((field) => field.id !== fieldId),
      columns: current.columns.filter((col) => col.id !== fieldId && col.key !== fieldToDelete?.key),
    }));

    if (typeof fieldId !== "number") return;

    try {
      const res = await fetch(`${API_BASE}/table-management/fields/${fieldId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error(`Delete field failed: ${res.status}`);

      await reloadTableManagementData();
      setAutoSavedMessage();
    } catch (err) {
      handleApiError(err);
    }
  }

  function moveField(fieldId, direction) {
    updateSelectedConfig((current) => {
      const fields = [...current.formFields];
      const index = fields.findIndex((field) => field.id === fieldId);
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (index < 0 || targetIndex < 0 || targetIndex >= fields.length) return current;

      const temp = fields[index];
      fields[index] = fields[targetIndex];
      fields[targetIndex] = temp;

      return {
        ...current,
        formFields: fields,
      };
    });
  }

  async function addNewField() {
    const label = newField.label.trim();
    if (!label) return;

    const key = makeFieldKey(label) || `field${Date.now()}`;
    const id = `${key}_${Date.now()}`;
    const moduleMeta = getActiveModuleMeta();
    const tableMeta = getActiveTableMeta();
    const sortOrder = (config.formFields || []).length + 1;

    updateSelectedConfig((current) => ({
      ...current,
      formFields: [
        ...current.formFields,
        {
          id,
          key,
          label,
          type: newField.type,
          required: newField.required,
          showAdd: newField.showAdd,
          showEdit: newField.showEdit,
          isSystemField: false,
        },
      ],
      columns: [
        ...current.columns,
        {
          id,
          label,
          key,
          type: newField.type,
          visible: true,
          required: newField.required,
          isSystemField: false,
        },
      ],
      dropdowns:
        newField.type === "Dropdown"
          ? {
            ...current.dropdowns,
            [label]: ["Sample Option 1", "Sample Option 2"],
          }
          : current.dropdowns,
    }));

    setNewField({
      label: "",
      type: "Text",
      required: false,
      showAdd: true,
      showEdit: true,
    });

    if (!moduleMeta?.id || !tableMeta?.id) return;

    try {
      const res = await fetch(`${API_BASE}/table-management/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: moduleMeta.id,
          tableId: tableMeta.id,
          fieldLabel: label,
          fieldKey: key,
          fieldType: newField.type,
          isRequired: newField.required,
          isVisible: true,
          showAdd: newField.showAdd,
          showEdit: newField.showEdit,
          sortOrder,
        }),
      });

      if (!res.ok) throw new Error(`Add field failed: ${res.status}`);

      await reloadTableManagementData();
      setAutoSavedMessage();
    } catch (err) {
      handleApiError(err);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div>
          <h1 style={styles.title}>Table Management</h1>
          <p style={styles.subtitle}>
            Configure table columns, form fields, dropdown lists, and Add/Edit modal fields for every page.
          </p>
        </div>


      </div>

      {(isLoadingConfig || configError || savingMessage) && (
        <div style={styles.statusPanel}>
          {isLoadingConfig && <Badge tone="amber">Loading database config...</Badge>}
          {configError && <Badge tone="red">{configError}</Badge>}
          {savingMessage && <Badge tone="green">{savingMessage}</Badge>}
        </div>
      )}

      <div style={styles.modulePanel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>Modules / Pages</h2>
            <p style={styles.panelText}>Click one module to preview its temporary table configuration.</p>
          </div>
        </div>

        <div style={styles.moduleGrid}>
          {MODULES.map((moduleName) => {
            const active = selectedModule === moduleName;

            return (
              <button
                key={moduleName}
                type="button"
                onClick={() => selectModule(moduleName)}
                style={{
                  ...styles.moduleCard,
                  ...(active ? styles.moduleCardActive : {}),
                }}
              >
                <span style={styles.moduleName}>{moduleName}</span>
                <span style={styles.moduleMeta}>
                  {configs[moduleName]?.tables ? `${Object.keys(configs[moduleName].tables).length} tables` : `${configs[moduleName]?.columns?.length || 0} columns`}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={styles.selectedBar}>
        <div>
          <div style={styles.selectedLabel}>Selected Module</div>
          <div style={styles.selectedTitle}>{selectedModule}{selectedModule === "DRRM" ? ` — ${selectedDrrmTable}` : ""}</div>
        </div>

        <div style={styles.selectedActions}>
          <button style={styles.primaryBtn} onClick={handleSaveConfiguration}>Save Configuration</button>
          <button
            style={styles.secondaryBtn}
            onClick={() => {
              setConfigs(DEFAULT_CONFIGS);
              setSelectedDropdown("");
              setNewOption("");
              setNewDropdownName("");
              setEditingDropdownName("");
              setEditingDropdownValue("");
              setSelectedDrrmTable("Activities Table");
              setSavedFieldRows({});
            }}
          >
            Reset Default
          </button>
        </div>
      </div>

      {selectedModule === "DRRM" && configs.DRRM?.tables && (
        <div style={styles.subTableSelectorPanel}>
          <div>
            <div style={styles.selectedLabel}>DRRM Table Selection</div>
            <div style={styles.subTableTitle}>Choose which DRRM table to configure</div>
          </div>

          <label style={styles.subTableSelectLabel}>
            Table
            <select
              value={selectedDrrmTable}
              onChange={(e) => {
                setSelectedDrrmTable(e.target.value);
                setSelectedDropdown("");
                setNewOption("");
                setNewDropdownName("");
                setEditingDropdownName("");
                setEditingDropdownValue("");
                setSavedFieldRows({});
              }}
              style={styles.subTableSelect}
            >
              {Object.keys(configs.DRRM?.tables || {}).map((tableName, index) => (
                <option key={tableName} value={tableName}>
                  Table {index + 1}: {tableName}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div style={styles.configLayout}>
        <SectionCard
          title="1. Table Columns"
          description="Manage which columns appear in the main page table."
          defaultOpen
        >
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Column Name</th>
                  <th style={styles.th}>Field Key</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Visible</th>
                  <th style={styles.th}>Required</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {config.columns.map((col) => (
                  <tr key={col.key}>
                    <td style={styles.td}>{col.label}</td>
                    <td style={styles.td}>
                      <code style={styles.code}>{col.key}</code>
                    </td>
                    <td style={styles.td}>{col.type}</td>
                    <td style={styles.td}>
                      <Badge tone={col.visible ? "green" : "gray"}>{col.visible ? "Yes" : "No"}</Badge>
                    </td>
                    <td style={styles.td}>
                      <Badge tone={col.required ? "red" : "gray"}>{col.required ? "Required" : "Optional"}</Badge>
                    </td>
                    <td style={styles.td}>
                      <button style={styles.smallBtn} onClick={() => toggleColumnVisibility(col.key)}>
                        {col.visible ? "Hide" : "Show"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.noteBox}>
            Temporary muna ito. Sa real database version, dito manggagaling ang column config per module.
          </div>
        </SectionCard>

        <SectionCard
          title="2. Form Field Builder"
          description="Modify fields like the Add Project modal: add, delete, rename, change type, required, show/hide, and reorder fields."
          defaultOpen
        >
          <div style={styles.builderLayout}>
            <div>
              <div style={styles.builderHeader}>
                <h3 style={styles.builderTitle}>Current Add/Edit Fields</h3>
                <Badge tone="amber">{config.formFields.length} fields</Badge>
              </div>

              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Order</th>
                      <th style={styles.th}>Field Label</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Add</th>
                      <th style={styles.th}>Edit</th>
                      <th style={styles.th}>Required</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.formFields.map((field, index) => (
                      <tr key={field.id}>
                        <td style={styles.td}>
                          <div style={styles.orderBtns}>
                            <button style={styles.tinyBtn} onClick={() => moveField(field.id, "up")}>↑</button>
                            <button style={styles.tinyBtn} onClick={() => moveField(field.id, "down")}>↓</button>
                          </div>
                        </td>

                        <td style={styles.td}>
                          <input
                            value={field.label}
                            onChange={(e) => {
                              const savedKey =
                                selectedModule === "DRRM"
                                  ? `${selectedModule}:${selectedDrrmTable}:${field.id}`
                                  : `${selectedModule}:${field.id}`;

                              setSavedFieldRows((prev) => ({
                                ...prev,
                                [savedKey]: false,
                              }));

                              updateField(field.id, { label: e.target.value });
                            }}
                            style={styles.inlineInput}
                          />
                        </td>

                        <td style={styles.td}>
                          <select
                            value={field.type}
                            onChange={(e) => updateField(field.id, { type: e.target.value })}
                            style={styles.inlineSelect}
                          >
                            {FIELD_TYPES.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </td>

                        <td style={styles.td}>
                          <input
                            type="checkbox"
                            checked={field.showAdd}
                            onChange={(e) => updateField(field.id, { showAdd: e.target.checked })}
                          />
                        </td>

                        <td style={styles.td}>
                          <input
                            type="checkbox"
                            checked={field.showEdit}
                            onChange={(e) => updateField(field.id, { showEdit: e.target.checked })}
                          />
                        </td>

                        <td style={styles.td}>
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateField(field.id, { required: e.target.checked })}
                          />
                        </td>

                        <td style={styles.td}>
                          <div style={styles.fieldActionGroup}>
                            <button
                              style={{ ...styles.smallBtn, ...styles.saveFieldBtn }}
                              onClick={() => saveFieldRow(field.id)}
                              title="Save this field label/type/settings"
                            >
                              {savedFieldRows[
                                selectedModule === "DRRM"
                                  ? `${selectedModule}:${selectedDrrmTable}:${field.id}`
                                  : `${selectedModule}:${field.id}`
                              ]
                                ? "Saved"
                                : "Save"}
                            </button>

                            <button style={{ ...styles.smallBtn, ...styles.dangerBtn }} onClick={() => openDeleteConfirm({ title: "Delete Field", message: `Are you sure you want to delete "${field.label}"?`, onConfirm: () => deleteField(field.id) })}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={styles.addFieldBox}>
                <h3 style={styles.builderTitle}>+ Add New Field</h3>

                <div style={styles.addFieldGrid}>
                  <label style={styles.label}>
                    Field Label
                    <input
                      value={newField.label}
                      onChange={(e) => setNewField((prev) => ({ ...prev, label: e.target.value }))}
                      placeholder="Example: Funding Source"
                      style={styles.input}
                    />
                  </label>

                  <label style={styles.label}>
                    Field Type
                    <select
                      value={newField.type}
                      onChange={(e) => setNewField((prev) => ({ ...prev, type: e.target.value }))}
                      style={styles.select}
                    >
                      {FIELD_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>

                  <div style={styles.addFieldOptionsRow}>
                    <label style={styles.checkLabel}>
                      <input
                        type="checkbox"
                        checked={newField.showAdd}
                        onChange={(e) => setNewField((prev) => ({ ...prev, showAdd: e.target.checked }))}
                      />
                      <span>Show in Add Form</span>
                    </label>

                    <label style={styles.checkLabel}>
                      <input
                        type="checkbox"
                        checked={newField.showEdit}
                        onChange={(e) => setNewField((prev) => ({ ...prev, showEdit: e.target.checked }))}
                      />
                      <span>Show in Edit Form</span>
                    </label>

                    <label style={styles.checkLabel}>
                      <input
                        type="checkbox"
                        checked={newField.required}
                        onChange={(e) => setNewField((prev) => ({ ...prev, required: e.target.checked }))}
                      />
                      <span>Required</span>
                    </label>
                  </div>

                  <button style={styles.primaryBtn} onClick={addNewField}>
                    + Add Field
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div style={styles.builderHeader}>
                <h3 style={styles.builderTitle}>Live Add Modal Preview</h3>
                <Badge tone="green">Preview</Badge>
              </div>

              <AddModalPreview
                moduleName={selectedModule}
                fields={config.formFields}
                dropdowns={config.dropdowns}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="3. Dropdown Lists"
          description="View all dropdown lists for the selected module, then manage values per list."
          defaultOpen
        >
          <div style={styles.dropdownManager}>
            <div style={styles.dropdownListToolbar}>
              <div>
                <h3 style={styles.builderTitle}>Dropdown Lists Table</h3>
                <p style={styles.miniDescription}>
                  Makikita dito lahat ng dropdown fields ng selected module. Click Manage Values para magdagdag o magbawas ng options.
                </p>
              </div>

              <div style={styles.addDropdownListRow}>
                <input
                  value={newDropdownName}
                  onChange={(e) => setNewDropdownName(e.target.value)}
                  placeholder="New dropdown list name..."
                  style={styles.input}
                />
                <button style={styles.primaryBtn} onClick={addDropdownList}>
                  + Add Dropdown List
                </button>
              </div>
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Dropdown Field</th>
                    <th style={styles.th}>Values Preview</th>
                    <th style={styles.th}>Total Values</th>
                    <th style={styles.th}>Used In</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dropdownNames.length === 0 ? (
                    <tr>
                      <td style={styles.td} colSpan={5}>No dropdown lists yet.</td>
                    </tr>
                  ) : (
                    dropdownNames.map((dropdownName) => {
                      const options = config.dropdowns[dropdownName] || [];
                      const isSelected = activeDropdown === dropdownName;
                      const isEditingName = editingDropdownName === dropdownName;

                      return (
                        <tr key={dropdownName} style={isSelected ? styles.selectedDropdownRow : undefined}>
                          <td style={styles.td}>
                            {isEditingName ? (
                              <div style={styles.renameRow}>
                                <input
                                  value={editingDropdownValue}
                                  onChange={(e) => setEditingDropdownValue(e.target.value)}
                                  style={styles.inlineInput}
                                  autoFocus
                                />
                                <button style={styles.smallBtn} onClick={() => saveRenameDropdownList(dropdownName)}>
                                  Save
                                </button>
                                <button
                                  style={styles.smallBtn}
                                  onClick={() => {
                                    setEditingDropdownName("");
                                    setEditingDropdownValue("");
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <strong>{dropdownName}</strong>
                            )}
                          </td>

                          <td style={styles.td}>
                            <span style={styles.valuesPreview}>
                              {options.length > 0 ? options.slice(0, 4).join(", ") : "No values yet"}
                              {options.length > 4 ? "..." : ""}
                            </span>
                          </td>

                          <td style={styles.td}>
                            <Badge tone={options.length > 0 ? "green" : "gray"}>{options.length}</Badge>
                          </td>

                          <td style={styles.td}>{getDropdownUsedIn(dropdownName)}</td>

                          <td style={styles.td}>
                            <div style={styles.actionGroup}>
                              <button
                                style={isSelected ? styles.primarySmallBtn : styles.smallBtn}
                                onClick={() => {
                                  setSelectedDropdown(dropdownName);
                                  setNewOption("");
                                }}
                              >
                                Manage Values
                              </button>
                              <button style={styles.smallBtn} onClick={() => startRenameDropdownList(dropdownName)}>
                                Rename
                              </button>
                              <button
                                style={{ ...styles.smallBtn, ...styles.dangerBtn }}
                                onClick={() => openDeleteConfirm({ title: "Delete Dropdown List", message: `Are you sure you want to delete "${dropdownName}"?`, onConfirm: () => deleteDropdownList(dropdownName) })}
                              >
                                Delete List
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {activeDropdown && (
              <div style={styles.manageValuesPanel}>
                <div style={styles.manageValuesHeader}>
                  <div>
                    <div style={styles.selectedLabel}>Selected Dropdown</div>
                    <h3 style={styles.manageValuesTitle}>{activeDropdown}</h3>
                    <p style={styles.miniDescription}>
                      Add or delete values under this dropdown list.
                    </p>
                  </div>

                  <Badge tone="green">{(config.dropdowns[activeDropdown] || []).length} values</Badge>
                </div>

                <div style={styles.addOptionRowFull}>
                  <input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder={`Add new value for ${activeDropdown}...`}
                    style={styles.input}
                  />
                  <button style={styles.primaryBtn} onClick={addDropdownOption}>
                    + Add Value
                  </button>
                </div>

                <div style={styles.optionList}>
                  {(config.dropdowns[activeDropdown] || []).length === 0 ? (
                    <div style={styles.emptyState}>
                      No values yet. Add the first dropdown value above.
                    </div>
                  ) : (
                    (config.dropdowns[activeDropdown] || []).map((option) => (
                      <div key={option} style={styles.optionItem}>
                        <span>{option}</span>
                        <button style={{ ...styles.smallBtn, ...styles.dangerBtn }} onClick={() => openDeleteConfirm({ title: "Delete Dropdown Value", message: `Are you sure you want to delete "${option}"?`, onConfirm: () => deleteDropdownOption(option) })}>
                          Delete
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="4. Table Behavior Settings"
          description="Controls for table behavior like search, export, print, pagination, actions column, and default sorting."
        >
          <div style={styles.settingsGrid}>
            <div style={styles.settingItem}>
              <span>Rows per page</span>
              <strong>10</strong>
            </div>
            <div style={styles.settingItem}>
              <span>Allow Search</span>
              <Badge tone="green">Yes</Badge>
            </div>
            <div style={styles.settingItem}>
              <span>Allow Export</span>
              <Badge tone="green">Yes</Badge>
            </div>
            <div style={styles.settingItem}>
              <span>Allow Print</span>
              <Badge tone="green">Yes</Badge>
            </div>
            <div style={styles.settingItem}>
              <span>Show Actions Column</span>
              <Badge tone="green">Yes</Badge>
            </div>
            <div style={styles.settingItem}>
              <span>Default Sort</span>
              <strong>Latest first</strong>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="5. Temporary Table Preview"
          description="This is the sample table output for the selected module."
          defaultOpen
        >
          <div style={styles.previewToolbar}>
            <input placeholder={`Search ${selectedModule} records...`} style={styles.searchInput} />
            <div style={styles.actionGroup}>
              <button style={styles.secondaryBtn}>Export</button>
              <button style={styles.secondaryBtn}>Print</button>
              <button style={styles.primaryBtn}>+ Add Entry</button>
            </div>
          </div>

          <SimpleTable columns={visibleColumns} rows={config.sampleRows} />
        </SectionCard>
      </div>

      <DeleteConfirmModal
        open={deleteConfirm?.open}
        title={deleteConfirm?.title}
        message={deleteConfirm?.message}
        onCancel={closeDeleteConfirm}
        onConfirm={runDeleteConfirm}
      />
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    padding: 24,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: "#0f172a",
  },
  hero: {
    background: "linear-gradient(135deg, #0f3b73 0%, #1559a8 55%, #2f80ed 100%)",
    color: "#ffffff",
    borderRadius: 24,
    padding: 28,
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    boxShadow: "0 18px 45px rgba(15, 59, 115, 0.25)",
  },
  title: {
    margin: 0,
    fontSize: 34,
    fontWeight: 900,
    letterSpacing: "-0.04em",
  },
  subtitle: {
    margin: "8px 0 0",
    color: "rgba(255,255,255,0.84)",
    fontSize: 15,
    maxWidth: 720,
  },
  heroRight: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  statusPanel: {
    marginTop: 16,
    background: "#ffffff",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
    border: "1px solid #e5e7eb",
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  modulePanel: {
    marginTop: 20,
    background: "#ffffff",
    borderRadius: 22,
    padding: 20,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
    border: "1px solid #e5e7eb",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  panelTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 900,
  },
  panelText: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: 14,
  },
  moduleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 12,
  },
  moduleCard: {
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    padding: 16,
    borderRadius: 18,
    textAlign: "left",
    cursor: "pointer",
    transition: "0.18s ease",
    minHeight: 84,
  },
  moduleCardActive: {
    border: "2px solid #2563eb",
    background: "#eff6ff",
    boxShadow: "0 10px 22px rgba(37, 99, 235, 0.15)",
  },
  moduleName: {
    display: "block",
    fontWeight: 900,
    fontSize: 15,
    marginBottom: 8,
  },
  moduleMeta: {
    fontSize: 12,
    color: "#64748b",
  },
  selectedBar: {
    marginTop: 20,
    background: "#ffffff",
    borderRadius: 22,
    padding: 20,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
    border: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  selectedLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  selectedTitle: {
    fontSize: 24,
    fontWeight: 950,
    marginTop: 2,
  },
  selectedActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  subTableSelectorPanel: {
    marginTop: 20,
    background: "#ffffff",
    borderRadius: 22,
    padding: 20,
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
    border: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  subTableTitle: {
    fontSize: 18,
    fontWeight: 950,
    marginTop: 2,
  },
  subTableSelectLabel: {
    display: "grid",
    gap: 8,
    fontSize: 13,
    fontWeight: 900,
    color: "#334155",
    minWidth: 280,
  },
  subTableSelect: {
    height: 44,
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    padding: "0 12px",
    background: "#ffffff",
    outline: "none",
    fontSize: 14,
    fontWeight: 800,
  },
  configLayout: {
    marginTop: 20,
    display: "grid",
    gap: 16,
  },
  sectionCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 22,
    overflow: "hidden",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
  },
  sectionHeader: {
    width: "100%",
    background: "#ffffff",
    border: 0,
    padding: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    textAlign: "left",
    cursor: "pointer",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 950,
    color: "#0f172a",
  },
  sectionDescription: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },
  chevron: {
    width: 36,
    height: 36,
    borderRadius: 12,
    background: "#eff6ff",
    color: "#2563eb",
    display: "grid",
    placeItems: "center",
    fontSize: 24,
    fontWeight: 900,
  },
  sectionBody: {
    borderTop: "1px solid #e5e7eb",
    padding: 20,
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 850,
    background: "#ffffff",
  },
  th: {
    background: "#f8fafc",
    borderBottom: "1px solid #e5e7eb",
    padding: "12px 14px",
    textAlign: "left",
    color: "#334155",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    whiteSpace: "nowrap",
  },
  td: {
    borderBottom: "1px solid #e5e7eb",
    padding: "13px 14px",
    fontSize: 14,
    color: "#0f172a",
    verticalAlign: "middle",
  },
  code: {
    background: "#f1f5f9",
    padding: "4px 7px",
    borderRadius: 8,
    color: "#1e293b",
    fontSize: 12,
  },
  noteBox: {
    marginTop: 14,
    background: "#f8fafc",
    color: "#475569",
    border: "1px dashed #cbd5e1",
    borderRadius: 14,
    padding: 14,
    fontSize: 13,
  },
  builderLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.5fr) minmax(360px, 0.8fr)",
    gap: 20,
    alignItems: "start",
  },
  builderHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  builderTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 950,
  },
  inlineInput: {
    width: "100%",
    minWidth: 170,
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    padding: "8px 10px",
    outline: "none",
  },
  inlineSelect: {
    minWidth: 140,
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    padding: "8px 10px",
    background: "#ffffff",
    outline: "none",
  },
  orderBtns: {
    display: "flex",
    gap: 6,
  },
  tinyBtn: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    borderRadius: 8,
    height: 28,
    width: 28,
    cursor: "pointer",
    fontWeight: 900,
  },
  addFieldBox: {
    marginTop: 16,
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 16,
  },
  addFieldGrid: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "minmax(260px, 1fr) 220px",
    gap: 12,
    alignItems: "end",
  },
  addFieldOptionsRow: {
    gridColumn: "1 / -1",
    display: "flex",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "12px 14px",
  },
  checkLabel: {
    display: "inline-flex",
    gap: 8,
    alignItems: "center",
    fontSize: 13,
    fontWeight: 800,
    color: "#334155",
    minHeight: "auto",
    whiteSpace: "nowrap",
  },
  dropdownManager: {
    display: "grid",
    gap: 18,
  },
  dropdownListToolbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "flex-end",
    flexWrap: "wrap",
  },
  miniDescription: {
    margin: "4px 0 0",
    fontSize: 13,
    color: "#64748b",
  },
  addDropdownListRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    minWidth: 360,
    flex: 1,
    justifyContent: "flex-end",
  },
  selectedDropdownRow: {
    background: "#eff6ff",
  },
  valuesPreview: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 1.4,
  },
  renameRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    minWidth: 320,
  },
  primarySmallBtn: {
    border: 0,
    background: "#2563eb",
    color: "#ffffff",
    borderRadius: 10,
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  manageValuesPanel: {
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    borderRadius: 18,
    padding: 16,
    display: "grid",
    gap: 14,
  },
  manageValuesHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  manageValuesTitle: {
    margin: "2px 0 0",
    fontSize: 20,
    fontWeight: 950,
  },
  addOptionRowFull: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  emptyState: {
    border: "1px dashed #cbd5e1",
    background: "#ffffff",
    borderRadius: 14,
    padding: 16,
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
  },
  dropdownTop: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 320px) 1fr",
    gap: 14,
  },
  label: {
    display: "grid",
    gap: 8,
    fontSize: 13,
    fontWeight: 800,
    color: "#334155",
  },
  select: {
    height: 44,
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    padding: "0 12px",
    background: "#ffffff",
    outline: "none",
    fontSize: 14,
  },
  input: {
    height: 44,
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    padding: "0 12px",
    outline: "none",
    fontSize: 14,
    flex: 1,
    minWidth: 180,
  },
  addOptionRow: {
    display: "flex",
    gap: 10,
  },
  optionList: {
    display: "grid",
    gap: 10,
  },
  optionItem: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    background: "#ffffff",
  },
  settingsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  settingItem: {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    fontSize: 14,
  },
  previewToolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
    flexWrap: "wrap",
  },
  searchInput: {
    height: 42,
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    padding: "0 12px",
    minWidth: 260,
    flex: 1,
    outline: "none",
  },
  actionGroup: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  primaryBtn: {
    border: 0,
    borderRadius: 12,
    background: "#2563eb",
    color: "#ffffff",
    padding: "10px 14px",
    fontWeight: 850,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(37, 99, 235, 0.2)",
    whiteSpace: "nowrap",
  },
  secondaryBtn: {
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    background: "#ffffff",
    color: "#0f172a",
    padding: "10px 14px",
    fontWeight: 850,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  smallBtn: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    borderRadius: 10,
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  dangerBtn: {
    borderColor: "#bfdbfe",
    color: "#0b4ea2",
    background: "#eff6ff",
  },
  saveFieldBtn: {
    border: "1px solid #bbf7d0",
    borderColor: "#bbf7d0",
    color: "#15803d",
    background: "#f0fdf4",
    borderRadius: 10,
    padding: "7px 10px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  deleteModalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    zIndex: 9999,
  },
  deleteModal: {
    width: "min(460px, 100%)",
    background: "#ffffff",
    borderRadius: 18,
    overflow: "hidden",
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.35)",
    border: "1px solid #bfdbfe",
  },
  deleteModalHeader: {
    background: "linear-gradient(135deg, #0b4ea2 0%, #2563eb 100%)",
    color: "#ffffff",
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  deleteModalTitle: {
    fontSize: 16,
    fontWeight: 900,
  },
  deleteModalSub: {
    fontSize: 12,
    opacity: 0.9,
    fontWeight: 700,
    marginTop: 2,
  },
  deleteModalClose: {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.5)",
    color: "#ffffff",
    borderRadius: 10,
    padding: "6px 10px",
    cursor: "pointer",
    fontWeight: 900,
  },
  deleteModalBody: {
    padding: 18,
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
  },
  deleteIconCircle: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    background: "#dbeafe",
    color: "#0b4ea2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 950,
    fontSize: 22,
    flex: "0 0 auto",
    border: "1px solid #bfdbfe",
  },
  deleteMessage: {
    fontSize: 15,
    fontWeight: 900,
    color: "#0f172a",
    lineHeight: 1.35,
  },
  deleteHelpText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 700,
    marginTop: 6,
    lineHeight: 1.35,
  },
  deleteModalFooter: {
    padding: 16,
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    borderTop: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  btnCancelDelete: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 900,
    cursor: "pointer",
  },
  btnConfirmDelete: {
    border: "1px solid #0b4ea2",
    background: "#0b4ea2",
    color: "#ffffff",
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(11, 78, 162, 0.22)",
  },
  modalPreviewShell: {
    background: "rgba(15, 23, 42, 0.08)",
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 14,
    overflow: "hidden",
  },
  modalPreview: {
    background: "#ffffff",
    borderRadius: 14,
    border: "1px solid #cbd5e1",
    overflow: "hidden",
    boxShadow: "0 14px 30px rgba(15, 23, 42, 0.12)",
  },
  modalPreviewHeader: {
    background: "#1559a8",
    color: "#ffffff",
    padding: "14px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalCloseBtn: {
    height: 28,
    width: 28,
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.55)",
    background: "transparent",
    color: "#ffffff",
    fontSize: 20,
    lineHeight: "20px",
    cursor: "pointer",
  },
  modalPreviewBody: {
    padding: 16,
    maxHeight: 500,
    overflowY: "auto",
  },
  modalPreviewFooter: {
    borderTop: "1px solid #e5e7eb",
    padding: 14,
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },
  previewGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
  },
  previewTwoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  previewLabel: {
    display: "grid",
    gap: 6,
    fontSize: 12,
    fontWeight: 850,
    color: "#0f172a",
  },
  requiredMark: {
    color: "#dc2626",
  },
  previewInput: {
    height: 38,
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "0 10px",
    fontSize: 12,
    outline: "none",
    background: "#ffffff",
  },
  addressPreviewBtn: {
    height: 38,
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "0 10px",
    fontSize: 12,
    outline: "none",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "#64748b",
    cursor: "pointer",
  },
  radioRow: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "10px",
    fontSize: 12,
    fontWeight: 700,
  },
};

export default TableManagement;

