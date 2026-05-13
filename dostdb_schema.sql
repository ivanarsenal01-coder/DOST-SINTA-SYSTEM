-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: 127.0.0.1    Database: dostdb
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `calibration`
--

DROP TABLE IF EXISTS `calibration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `calibration` (
  `id` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `project_id` int DEFAULT NULL,
  `project_intervention_id` int DEFAULT NULL,
  `source_module` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `source_table` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `category` enum('PAYING','NON-PAYING') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'PAYING',
  `date` date NOT NULL,
  `typeOfSample` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `testType` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `noOfSample` int NOT NULL DEFAULT '0',
  `range` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cost` decimal(12,2) NOT NULL DEFAULT '0.00',
  `feesCollected` decimal(12,2) NOT NULL DEFAULT '0.00',
  `mcBreakdown` longtext COLLATE utf8mb4_general_ci,
  `barangay` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_general_ci,
  `addressMeta` longtext COLLATE utf8mb4_general_ci,
  `female` int NOT NULL DEFAULT '0',
  `male` int NOT NULL DEFAULT '0',
  `totalCustomers` int NOT NULL DEFAULT '0',
  `noOfFirms` int NOT NULL DEFAULT '0',
  `noOfNewFirms` int NOT NULL DEFAULT '0',
  `ageRange` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `pwd` int NOT NULL DEFAULT '0',
  `ip` int NOT NULL DEFAULT '0',
  `sc` int NOT NULL DEFAULT '0',
  `fourPs` int NOT NULL DEFAULT '0',
  `nameOfStaff` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `means_of_verification` longtext COLLATE utf8mb4_general_ci,
  `photos` longtext COLLATE utf8mb4_general_ci,
  `remarks` text COLLATE utf8mb4_general_ci,
  `custom_fields` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_project_intervention_id` (`project_intervention_id`),
  KEY `idx_calibration_date` (`date`),
  KEY `idx_calibration_category` (`category`),
  KEY `idx_calibration_typeOfSample` (`typeOfSample`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cest`
--

DROP TABLE IF EXISTS `cest`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cest` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quarter` varchar(10) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '1',
  `type` varchar(100) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'New Communities',
  `projectTitle` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `dateProjectApproval` date DEFAULT NULL,
  `approvedProjectCost` decimal(15,2) NOT NULL DEFAULT '0.00',
  `dateFundRelease` date DEFAULT NULL,
  `associationName` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `address` text COLLATE utf8mb4_general_ci,
  `lgu_numbers_of_communities` text COLLATE utf8mb4_general_ci,
  `number_of_moa` int NOT NULL DEFAULT '0',
  `address_mode` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_manual_text` text COLLATE utf8mb4_general_ci,
  `address_province` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_municipality` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_barangay` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_lat` decimal(12,8) DEFAULT NULL,
  `address_lng` decimal(12,8) DEFAULT NULL,
  `projectProponent` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sex` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `processSystem` text COLLATE utf8mb4_general_ci,
  `press_release` int NOT NULL DEFAULT '0',
  `communitiesAssisted` int NOT NULL DEFAULT '0',
  `technologiesDeployed` int NOT NULL DEFAULT '0',
  `beneficiaries` int NOT NULL DEFAULT '0',
  `startupsAssisted` text COLLATE utf8mb4_general_ci,
  `jobsGenerated` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `custom_fields` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cest_interventions`
--

DROP TABLE IF EXISTS `cest_interventions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cest_interventions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `type` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `date` date DEFAULT NULL,
  `venue` text COLLATE utf8mb4_general_ci,
  `no_of_firms` int DEFAULT NULL,
  `male` int DEFAULT NULL,
  `female` int DEFAULT NULL,
  `total` int DEFAULT NULL,
  `notes` longtext COLLATE utf8mb4_general_ci,
  `technologies_promoted_total` int NOT NULL DEFAULT '0',
  `promotional_activities_press_release` int NOT NULL DEFAULT '0',
  `pwd` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `four_ps` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ip` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `seniors` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tacs_consultancy_type` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tacs_date_engagement` date DEFAULT NULL,
  `tacs_expert_institution` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tacs_customer_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tacs_customer_sex` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tacs_customer_address` text COLLATE utf8mb4_general_ci,
  `tacs_customer_address_meta` longtext COLLATE utf8mb4_general_ci,
  `tacs_means_verification` text COLLATE utf8mb4_general_ci,
  `tacs_no_of_advice` int DEFAULT NULL,
  `tacs_remarks` text COLLATE utf8mb4_general_ci,
  `tacs_photos` longtext COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `program_training` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `province` varchar(120) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `venue_address_meta` longtext COLLATE utf8mb4_general_ci,
  `no_of_firms_sucs_heis_lgus` int DEFAULT '0',
  `participants_female` int DEFAULT '0',
  `participants_male` int DEFAULT '0',
  `senior_female` int DEFAULT '0',
  `senior_male` int DEFAULT '0',
  `ip_female` int DEFAULT '0',
  `ip_male` int DEFAULT '0',
  `fourps_female` int DEFAULT '0',
  `fourps_male` int DEFAULT '0',
  `pwd_female` int DEFAULT '0',
  `pwd_male` int DEFAULT '0',
  `total_female` int DEFAULT '0',
  `total_male` int DEFAULT '0',
  `total_participants` int DEFAULT '0',
  `list_of_firms_associations` text COLLATE utf8mb4_general_ci,
  `name_of_trainor_affiliation` text COLLATE utf8mb4_general_ci,
  `program_project_unit` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `dost_cost` decimal(12,2) DEFAULT '0.00',
  `partner_agency_cost` decimal(12,2) DEFAULT '0.00',
  `total_cost` decimal(12,2) DEFAULT '0.00',
  `notes_remarks` text COLLATE utf8mb4_general_ci,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `techrollout_quarter` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `techrollout_unit_center` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `techrollout_name_of_technology_transferred` text COLLATE utf8mb4_general_ci,
  `techrollout_technology_generator` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `techrollout_mode_of_transfer` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `techrollout_is_dost_developed_funded` tinyint(1) NOT NULL DEFAULT '0',
  `techrollout_date_transferred` date DEFAULT NULL,
  `techrollout_activity_title` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `techrollout_activity_date` date DEFAULT NULL,
  `techrollout_activity_venue` text COLLATE utf8mb4_general_ci,
  `techrollout_institution_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `techrollout_institution_address` text COLLATE utf8mb4_general_ci,
  `techrollout_institution_address_meta` longtext COLLATE utf8mb4_general_ci,
  `techrollout_classification` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `techrollout_representative_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `techrollout_representative_designation` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `techrollout_sex` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `project_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `technology_promoted` text COLLATE utf8mb4_general_ci,
  `technology_generator` text COLLATE utf8mb4_general_ci,
  `mode_of_promotion` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `customer_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `customer_address` text COLLATE utf8mb4_general_ci,
  `sex` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `staff_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `means_of_verification` text COLLATE utf8mb4_general_ci,
  `photos` longtext COLLATE utf8mb4_general_ci,
  `packaging_quarter` int DEFAULT NULL,
  `packaging_province` varchar(120) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `packaging_date_completed` date DEFAULT NULL,
  `packaging_type_of_intervention` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `packaging_product_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `packaging_size_variant` text COLLATE utf8mb4_general_ci,
  `packaging_materials_provided` text COLLATE utf8mb4_general_ci,
  `packaging_customer_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `packaging_sex` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `packaging_firm_institution` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `packaging_address` text COLLATE utf8mb4_general_ci,
  `packaging_address_meta` longtext COLLATE utf8mb4_general_ci,
  `packaging_means_of_verification` text COLLATE utf8mb4_general_ci,
  `packaging_photos` longtext COLLATE utf8mb4_general_ci,
  `packaging_remarks` text COLLATE utf8mb4_general_ci,
  `calibration_category` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `calibration_date` date DEFAULT NULL,
  `calibration_type_of_sample` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `calibration_test_type` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `calibration_no_of_sample` int DEFAULT '0',
  `calibration_range` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `calibration_cost` decimal(12,2) DEFAULT '0.00',
  `calibration_fees_collected` decimal(12,2) DEFAULT '0.00',
  `calibration_mc_breakdown` longtext COLLATE utf8mb4_general_ci,
  `calibration_barangay` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `calibration_address` text COLLATE utf8mb4_general_ci,
  `calibration_address_meta` longtext COLLATE utf8mb4_general_ci,
  `calibration_female` int DEFAULT '0',
  `calibration_male` int DEFAULT '0',
  `calibration_total_customers` int DEFAULT '0',
  `calibration_no_of_firms` int DEFAULT '0',
  `calibration_no_of_new_firms` int DEFAULT '0',
  `calibration_age_range` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `calibration_pwd` int DEFAULT '0',
  `calibration_ip` int DEFAULT '0',
  `calibration_sc` int DEFAULT '0',
  `calibration_four_ps` int DEFAULT '0',
  `calibration_remarks` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  KEY `fk_cest_interventions_project` (`project_id`),
  CONSTRAINT `fk_cest_interventions_project` FOREIGN KEY (`project_id`) REFERENCES `cest` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cest_other_indicators`
--

DROP TABLE IF EXISTS `cest_other_indicators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cest_other_indicators` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `jobs_q1` decimal(12,2) DEFAULT '0.00',
  `jobs_q2` decimal(12,2) DEFAULT '0.00',
  `jobs_q3` decimal(12,2) DEFAULT '0.00',
  `jobs_q4` decimal(12,2) DEFAULT '0.00',
  `jobs_inc_q1` decimal(12,2) DEFAULT '0.00',
  `jobs_inc_q2` decimal(12,2) DEFAULT '0.00',
  `jobs_inc_q3` decimal(12,2) DEFAULT '0.00',
  `jobs_inc_q4` decimal(12,2) DEFAULT '0.00',
  `prod_q1` decimal(12,2) DEFAULT '0.00',
  `prod_q2` decimal(12,2) DEFAULT '0.00',
  `prod_q3` decimal(12,2) DEFAULT '0.00',
  `prod_q4` decimal(12,2) DEFAULT '0.00',
  `gross_q1` decimal(12,2) DEFAULT '0.00',
  `gross_q2` decimal(12,2) DEFAULT '0.00',
  `gross_q3` decimal(12,2) DEFAULT '0.00',
  `gross_q4` decimal(12,2) DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_id` (`project_id`),
  CONSTRAINT `fk_cest_other_indicators_project` FOREIGN KEY (`project_id`) REFERENCES `cest` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `drrm_activities`
--

DROP TABLE IF EXISTS `drrm_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `drrm_activities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(500) NOT NULL,
  `date_start` date NOT NULL,
  `date_end` date DEFAULT NULL,
  `venue_text` text,
  `venue_mode` varchar(30) DEFAULT NULL,
  `venue_manual_text` text,
  `venue_display_text` text,
  `venue_province` varchar(120) DEFAULT NULL,
  `venue_municipality` varchar(120) DEFAULT NULL,
  `venue_barangay` varchar(120) DEFAULT NULL,
  `venue_lat` decimal(12,8) DEFAULT NULL,
  `venue_lng` decimal(12,8) DEFAULT NULL,
  `co_organizer` text,
  `male` int NOT NULL DEFAULT '0',
  `female` int NOT NULL DEFAULT '0',
  `total` int NOT NULL DEFAULT '0',
  `means_of_verification` text,
  `mov_photos` longtext,
  `remarks` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `custom_fields` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `drrm_activity_sectors`
--

DROP TABLE IF EXISTS `drrm_activity_sectors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `drrm_activity_sectors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `activity_id` int NOT NULL,
  `sector_name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_drrm_activity_sectors_activity_id` (`activity_id`),
  CONSTRAINT `fk_drrm_activity_sectors_activity_id` FOREIGN KEY (`activity_id`) REFERENCES `drrm_activities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `drrm_collaboration_stakeholders`
--

DROP TABLE IF EXISTS `drrm_collaboration_stakeholders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `drrm_collaboration_stakeholders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `collaboration_id` int NOT NULL,
  `stakeholder_name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_drrm_collab_stakeholders_collaboration_id` (`collaboration_id`),
  CONSTRAINT `fk_drrm_collab_stakeholders_collaboration_id` FOREIGN KEY (`collaboration_id`) REFERENCES `drrm_collaborations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `drrm_collaborations`
--

DROP TABLE IF EXISTS `drrm_collaborations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `drrm_collaborations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(500) NOT NULL,
  `activity_date` date NOT NULL,
  `means_of_verification` text,
  `mov_photos` longtext,
  `remarks` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `drrm_dropdown_options`
--

DROP TABLE IF EXISTS `drrm_dropdown_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `drrm_dropdown_options` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` enum('sector','iec_title','iec_source','stakeholder') NOT NULL,
  `option_name` varchar(500) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_drrm_dropdown_option` (`category`,`option_name`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `drrm_iec_materials`
--

DROP TABLE IF EXISTS `drrm_iec_materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `drrm_iec_materials` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date_used` date NOT NULL,
  `male` int NOT NULL DEFAULT '0',
  `female` int NOT NULL DEFAULT '0',
  `total` int NOT NULL DEFAULT '0',
  `means_of_verification` text,
  `mov_photos` longtext,
  `remarks` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `custom_fields` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `drrm_iec_sources`
--

DROP TABLE IF EXISTS `drrm_iec_sources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `drrm_iec_sources` (
  `id` int NOT NULL AUTO_INCREMENT,
  `iec_id` int NOT NULL,
  `source_name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_drrm_iec_sources_iec_id` (`iec_id`),
  CONSTRAINT `fk_drrm_iec_sources_iec_id` FOREIGN KEY (`iec_id`) REFERENCES `drrm_iec_materials` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `drrm_iec_titles`
--

DROP TABLE IF EXISTS `drrm_iec_titles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `drrm_iec_titles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `iec_id` int NOT NULL,
  `title_name` varchar(500) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_drrm_iec_titles_iec_id` (`iec_id`),
  CONSTRAINT `fk_drrm_iec_titles_iec_id` FOREIGN KEY (`iec_id`) REFERENCES `drrm_iec_materials` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `drrm_pscp`
--

DROP TABLE IF EXISTS `drrm_pscp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `drrm_pscp` (
  `id` int NOT NULL AUTO_INCREMENT,
  `year_value` int NOT NULL,
  `item_type` enum('crafted','implemented') NOT NULL,
  `q1` enum('YES','NO') DEFAULT NULL,
  `q2` enum('YES','NO') DEFAULT NULL,
  `q3` enum('YES','NO') DEFAULT NULL,
  `q4` enum('YES','NO') DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_drrm_pscp_year_type` (`year_value`,`item_type`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `packaging_labeling_photos`
--

DROP TABLE IF EXISTS `packaging_labeling_photos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `packaging_labeling_photos` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `record_id` bigint unsigned NOT NULL,
  `photo_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `photo_type` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `photo_data` longtext COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_packaging_photos_record` (`record_id`),
  CONSTRAINT `fk_packaging_photos_record` FOREIGN KEY (`record_id`) REFERENCES `packaging_labeling_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `packaging_labeling_products`
--

DROP TABLE IF EXISTS `packaging_labeling_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `packaging_labeling_products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `record_id` bigint unsigned NOT NULL,
  `product_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_packaging_products_record` (`record_id`),
  CONSTRAINT `fk_packaging_products_record` FOREIGN KEY (`record_id`) REFERENCES `packaging_labeling_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `packaging_labeling_records`
--

DROP TABLE IF EXISTS `packaging_labeling_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `packaging_labeling_records` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `project_id` int DEFAULT NULL,
  `intervention_id` int DEFAULT NULL,
  `source_module` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `source_type` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `quarter` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `province` varchar(100) COLLATE utf8mb4_general_ci DEFAULT 'Pangasinan',
  `date_completed` date NOT NULL,
  `type_of_intervention` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `product_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `size_variant` text COLLATE utf8mb4_general_ci NOT NULL,
  `packaging_materials_provided` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `customer_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `sex` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `firm_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `address` text COLLATE utf8mb4_general_ci NOT NULL,
  `address_mode` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_manual_text` text COLLATE utf8mb4_general_ci,
  `address_display_text` text COLLATE utf8mb4_general_ci,
  `municipality` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `barangay` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `lat` decimal(10,7) DEFAULT NULL,
  `lng` decimal(10,7) DEFAULT NULL,
  `means_of_verification` text COLLATE utf8mb4_general_ci,
  `name_of_staff` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_general_ci,
  `custom_fields` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_packaging_project_id` (`project_id`),
  KEY `idx_packaging_intervention_id` (`intervention_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `project_interventions`
--

DROP TABLE IF EXISTS `project_interventions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_interventions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `type` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `venue` varchar(255) COLLATE utf8mb4_general_ci DEFAULT '',
  `province` varchar(120) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `no_of_firms` int DEFAULT NULL,
  `firms_sucs_heis_lgus_count` int DEFAULT NULL,
  `male` int DEFAULT NULL,
  `female` int DEFAULT NULL,
  `senior_female` int DEFAULT NULL,
  `senior_male` int DEFAULT NULL,
  `ip_female` int DEFAULT NULL,
  `ip_male` int DEFAULT NULL,
  `fourps_female` int DEFAULT NULL,
  `fourps_male` int DEFAULT NULL,
  `pwd_female` int DEFAULT NULL,
  `pwd_male` int DEFAULT NULL,
  `total_female` int DEFAULT NULL,
  `total_male` int DEFAULT NULL,
  `total_participants` int DEFAULT NULL,
  `firms_sucs_heis_lgus_list` text COLLATE utf8mb4_general_ci,
  `firms_associations_list` text COLLATE utf8mb4_general_ci,
  `trainor_affiliation` text COLLATE utf8mb4_general_ci,
  `project_program_unit` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cost_dost` decimal(15,2) DEFAULT NULL,
  `cost_partner_agency` decimal(15,2) DEFAULT NULL,
  `total_cost` decimal(15,2) DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_general_ci,
  `total` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_general_ci,
  `technologies_promoted_total` int DEFAULT '0',
  `promotional_activities_press_release` int DEFAULT '0',
  `pwd` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `four_ps` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ip` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `seniors` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tacs_consultancy_type` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tacs_date_engagement` date DEFAULT NULL,
  `tacs_expert_institution` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tacs_customer_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tacs_customer_sex` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tacs_customer_address` text COLLATE utf8mb4_general_ci,
  `tacs_customer_address_meta` longtext COLLATE utf8mb4_general_ci,
  `tacs_means_verification` text COLLATE utf8mb4_general_ci,
  `tacs_no_of_advice` int DEFAULT NULL,
  `tacs_remarks` text COLLATE utf8mb4_general_ci,
  `tacs_photos` longtext COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  KEY `project_id` (`project_id`),
  CONSTRAINT `project_interventions_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `project_other_indicators`
--

DROP TABLE IF EXISTS `project_other_indicators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_other_indicators` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `jobs_q1` decimal(12,2) NOT NULL DEFAULT '0.00',
  `jobs_q2` decimal(12,2) NOT NULL DEFAULT '0.00',
  `jobs_q3` decimal(12,2) NOT NULL DEFAULT '0.00',
  `jobs_q4` decimal(12,2) NOT NULL DEFAULT '0.00',
  `jobs_inc_q1` decimal(8,2) NOT NULL DEFAULT '0.00',
  `jobs_inc_q2` decimal(8,2) NOT NULL DEFAULT '0.00',
  `jobs_inc_q3` decimal(8,2) NOT NULL DEFAULT '0.00',
  `jobs_inc_q4` decimal(8,2) NOT NULL DEFAULT '0.00',
  `prod_q1` decimal(8,2) NOT NULL DEFAULT '0.00',
  `prod_q2` decimal(8,2) NOT NULL DEFAULT '0.00',
  `prod_q3` decimal(8,2) NOT NULL DEFAULT '0.00',
  `prod_q4` decimal(8,2) NOT NULL DEFAULT '0.00',
  `gross_q1` decimal(12,2) NOT NULL DEFAULT '0.00',
  `gross_q2` decimal(12,2) NOT NULL DEFAULT '0.00',
  `gross_q3` decimal(12,2) NOT NULL DEFAULT '0.00',
  `gross_q4` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_id` (`project_id`),
  CONSTRAINT `fk_poi_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `project_statuses`
--

DROP TABLE IF EXISTS `project_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_statuses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `project_types`
--

DROP TABLE IF EXISTS `project_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `quarter` tinyint NOT NULL,
  `firm_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `cooperator_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `age` int DEFAULT NULL,
  `sex` enum('M','F','') COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
  `district` varchar(100) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
  `address` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `funded` enum('Y','N') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'N',
  `amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `remarks` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `date_approved` date DEFAULT NULL,
  `moa_signed` date DEFAULT NULL,
  `stpms_status` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phase` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_mode` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_manual_text` text COLLATE utf8mb4_general_ci,
  `address_province` varchar(120) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_municipality` varchar(120) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_barangay` varchar(120) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_lat` decimal(10,7) DEFAULT NULL,
  `address_lng` decimal(10,7) DEFAULT NULL,
  `project_proponent` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `process_system` text COLLATE utf8mb4_general_ci,
  `communities_assisted` int DEFAULT '0',
  `technologies_deployed` int DEFAULT '0',
  `beneficiaries` int DEFAULT '0',
  `startups_assisted` int DEFAULT '0',
  `jobs_generated` int DEFAULT '0',
  `spin_number` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sector` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `custom_fields` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `special_projects`
--

DROP TABLE IF EXISTS `special_projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `special_projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quarter` varchar(5) NOT NULL,
  `beneficiary_name` varchar(255) NOT NULL,
  `address` text NOT NULL,
  `address_mode` varchar(50) DEFAULT NULL,
  `address_manual_text` text,
  `address_province` varchar(100) DEFAULT NULL,
  `address_municipality` varchar(150) DEFAULT NULL,
  `address_barangay` varchar(150) DEFAULT NULL,
  `address_lat` decimal(10,7) DEFAULT NULL,
  `address_lng` decimal(10,7) DEFAULT NULL,
  `special_project` text NOT NULL,
  `project_title` varchar(255) DEFAULT NULL,
  `date_project_approved` date NOT NULL,
  `project_cost` decimal(15,2) NOT NULL DEFAULT '0.00',
  `means_of_verification` text,
  `mov_photos` longtext,
  `staff_name` varchar(255) DEFAULT NULL,
  `snt_interventions` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `custom_fields` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_special_projects_date` (`date_project_approved`),
  KEY `idx_special_projects_quarter` (`quarter`),
  KEY `idx_special_projects_municipality` (`address_municipality`),
  KEY `idx_special_projects_barangay` (`address_barangay`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sscp`
--

DROP TABLE IF EXISTS `sscp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sscp` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quarter` varchar(10) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '1',
  `type` varchar(100) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'New Communities',
  `projectTitle` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `dateProjectApproval` date DEFAULT NULL,
  `approvedProjectCost` decimal(15,2) NOT NULL DEFAULT '0.00',
  `dateFundRelease` date DEFAULT NULL,
  `associationName` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `address` text COLLATE utf8mb4_general_ci,
  `address_mode` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_manual_text` text COLLATE utf8mb4_general_ci,
  `address_province` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_municipality` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_barangay` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_lat` decimal(12,8) DEFAULT NULL,
  `address_lng` decimal(12,8) DEFAULT NULL,
  `projectProponent` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sex` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `processSystem` text COLLATE utf8mb4_general_ci,
  `communitiesAssisted` int NOT NULL DEFAULT '0',
  `technologiesDeployed` int NOT NULL DEFAULT '0',
  `beneficiaries` int NOT NULL DEFAULT '0',
  `startupsAssisted` int NOT NULL DEFAULT '0',
  `jobsGenerated` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `custom_fields` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sscp_interventions`
--

DROP TABLE IF EXISTS `sscp_interventions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sscp_interventions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `type` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `date` date DEFAULT NULL,
  `venue` text COLLATE utf8mb4_general_ci,
  `no_of_firms` int DEFAULT NULL,
  `male` int DEFAULT NULL,
  `female` int DEFAULT NULL,
  `total` int DEFAULT NULL,
  `notes` longtext COLLATE utf8mb4_general_ci,
  `technologies_promoted_total` int NOT NULL DEFAULT '0',
  `promotional_activities_press_release` int NOT NULL DEFAULT '0',
  `pwd` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `four_ps` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ip` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `seniors` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tacs_consultancy_type` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tacs_date_engagement` date DEFAULT NULL,
  `tacs_expert_institution` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tacs_customer_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tacs_customer_sex` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `tacs_customer_address` text COLLATE utf8mb4_general_ci,
  `tacs_customer_address_meta` longtext COLLATE utf8mb4_general_ci,
  `tacs_means_verification` text COLLATE utf8mb4_general_ci,
  `tacs_no_of_advice` int DEFAULT NULL,
  `tacs_remarks` text COLLATE utf8mb4_general_ci,
  `tacs_photos` longtext COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `program_training` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `province` varchar(120) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `venue_address_meta` longtext COLLATE utf8mb4_general_ci,
  `no_of_firms_sucs_heis_lgus` int DEFAULT '0',
  `participants_female` int DEFAULT '0',
  `participants_male` int DEFAULT '0',
  `senior_female` int DEFAULT '0',
  `senior_male` int DEFAULT '0',
  `ip_female` int DEFAULT '0',
  `ip_male` int DEFAULT '0',
  `fourps_female` int DEFAULT '0',
  `fourps_male` int DEFAULT '0',
  `pwd_female` int DEFAULT '0',
  `pwd_male` int DEFAULT '0',
  `total_female` int DEFAULT '0',
  `total_male` int DEFAULT '0',
  `total_participants` int DEFAULT '0',
  `list_of_firms_associations` text COLLATE utf8mb4_general_ci,
  `name_of_trainor_affiliation` text COLLATE utf8mb4_general_ci,
  `program_project_unit` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `dost_cost` decimal(12,2) DEFAULT '0.00',
  `partner_agency_cost` decimal(12,2) DEFAULT '0.00',
  `total_cost` decimal(12,2) DEFAULT '0.00',
  `notes_remarks` text COLLATE utf8mb4_general_ci,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `techrollout_quarter` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `techrollout_unit_center` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `techrollout_name_of_technology_transferred` text COLLATE utf8mb4_general_ci,
  `techrollout_technology_generator` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `techrollout_mode_of_transfer` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `techrollout_is_dost_developed_funded` tinyint(1) NOT NULL DEFAULT '0',
  `techrollout_date_transferred` date DEFAULT NULL,
  `techrollout_activity_title` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `techrollout_activity_date` date DEFAULT NULL,
  `techrollout_activity_venue` text COLLATE utf8mb4_general_ci,
  `techrollout_institution_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `techrollout_institution_address` text COLLATE utf8mb4_general_ci,
  `techrollout_institution_address_meta` longtext COLLATE utf8mb4_general_ci,
  `techrollout_classification` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `techrollout_representative_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `techrollout_representative_designation` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `techrollout_sex` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `project_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `technology_promoted` text COLLATE utf8mb4_general_ci,
  `technology_generator` text COLLATE utf8mb4_general_ci,
  `mode_of_promotion` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `customer_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `customer_address` text COLLATE utf8mb4_general_ci,
  `sex` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `staff_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `means_of_verification` text COLLATE utf8mb4_general_ci,
  `photos` longtext COLLATE utf8mb4_general_ci,
  `packaging_quarter` int DEFAULT NULL,
  `packaging_province` varchar(120) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `packaging_date_completed` date DEFAULT NULL,
  `packaging_type_of_intervention` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `packaging_product_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `packaging_size_variant` text COLLATE utf8mb4_general_ci,
  `packaging_materials_provided` text COLLATE utf8mb4_general_ci,
  `packaging_customer_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `packaging_sex` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `packaging_firm_institution` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `packaging_address` text COLLATE utf8mb4_general_ci,
  `packaging_address_meta` longtext COLLATE utf8mb4_general_ci,
  `packaging_means_of_verification` text COLLATE utf8mb4_general_ci,
  `packaging_photos` longtext COLLATE utf8mb4_general_ci,
  `packaging_remarks` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  KEY `idx_sscp_interventions_type` (`type`),
  KEY `fk_sscp_interventions_project` (`project_id`),
  CONSTRAINT `fk_sscp_interventions_project` FOREIGN KEY (`project_id`) REFERENCES `sscp_projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sscp_lgus`
--

DROP TABLE IF EXISTS `sscp_lgus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sscp_lgus` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lgu_community` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `address` text COLLATE utf8mb4_general_ci,
  `address_mode` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_manual_text` text COLLATE utf8mb4_general_ci,
  `address_province` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_municipality` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_barangay` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_lat` decimal(10,7) DEFAULT NULL,
  `address_lng` decimal(10,7) DEFAULT NULL,
  `moa_mou_type` varchar(20) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `moa_mou_title` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `partners` text COLLATE utf8mb4_general_ci,
  `is_smart_city` tinyint(1) DEFAULT '0',
  `smart_city_date` date DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `custom_fields` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sscp_lgus_municipality` (`address_municipality`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sscp_other_indicators`
--

DROP TABLE IF EXISTS `sscp_other_indicators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sscp_other_indicators` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `jobs_q1` decimal(12,2) DEFAULT '0.00',
  `jobs_q2` decimal(12,2) DEFAULT '0.00',
  `jobs_q3` decimal(12,2) DEFAULT '0.00',
  `jobs_q4` decimal(12,2) DEFAULT '0.00',
  `jobs_inc_q1` decimal(12,2) DEFAULT '0.00',
  `jobs_inc_q2` decimal(12,2) DEFAULT '0.00',
  `jobs_inc_q3` decimal(12,2) DEFAULT '0.00',
  `jobs_inc_q4` decimal(12,2) DEFAULT '0.00',
  `prod_q1` decimal(12,2) DEFAULT '0.00',
  `prod_q2` decimal(12,2) DEFAULT '0.00',
  `prod_q3` decimal(12,2) DEFAULT '0.00',
  `prod_q4` decimal(12,2) DEFAULT '0.00',
  `gross_q1` decimal(12,2) DEFAULT '0.00',
  `gross_q2` decimal(12,2) DEFAULT '0.00',
  `gross_q3` decimal(12,2) DEFAULT '0.00',
  `gross_q4` decimal(12,2) DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_id` (`project_id`),
  CONSTRAINT `fk_sscp_other_indicators_project` FOREIGN KEY (`project_id`) REFERENCES `sscp` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sscp_projects`
--

DROP TABLE IF EXISTS `sscp_projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sscp_projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sscp_lgu_id` int NOT NULL,
  `project_title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `date_project_approval` date DEFAULT NULL,
  `approved_project_cost` decimal(15,2) DEFAULT '0.00',
  `date_fund_release` date DEFAULT NULL,
  `association_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_general_ci,
  `address_mode` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_manual_text` text COLLATE utf8mb4_general_ci,
  `address_province` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_municipality` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_barangay` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_lat` decimal(10,7) DEFAULT NULL,
  `address_lng` decimal(10,7) DEFAULT NULL,
  `project_proponent` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sex` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `process_system` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sscp_projects_lgu_id` (`sscp_lgu_id`),
  CONSTRAINT `fk_sscp_projects_lgu` FOREIGN KEY (`sscp_lgu_id`) REFERENCES `sscp_lgus` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `st_promo`
--

DROP TABLE IF EXISTS `st_promo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `st_promo` (
  `id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entryMode` enum('ONLINE','ONSITE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ONLINE',
  `date` date NOT NULL,
  `projectTitle` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activityType` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `regional` int NOT NULL DEFAULT '0',
  `provincial` int NOT NULL DEFAULT '0',
  `cityMunicipality` int NOT NULL DEFAULT '0',
  `male` int NOT NULL DEFAULT '0',
  `female` int NOT NULL DEFAULT '0',
  `totalParticipants` int NOT NULL DEFAULT '0',
  `peopleReached` int NOT NULL DEFAULT '0',
  `views` int NOT NULL DEFAULT '0',
  `reaction` int NOT NULL DEFAULT '0',
  `comment` int NOT NULL DEFAULT '0',
  `share` int NOT NULL DEFAULT '0',
  `totalEngagements` int NOT NULL DEFAULT '0',
  `meansOfVerification` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `addressMeta` longtext COLLATE utf8mb4_unicode_ci,
  `municipality` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `district` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `barangay` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `staffName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `custom_fields` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_st_promo_date` (`date`),
  KEY `idx_st_promo_entryMode` (`entryMode`),
  KEY `idx_st_promo_municipality` (`municipality`),
  KEY `idx_st_promo_district` (`district`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `table_management_dropdown_options`
--

DROP TABLE IF EXISTS `table_management_dropdown_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_management_dropdown_options` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dropdown_id` int NOT NULL,
  `option_value` varchar(255) NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_tm_dropdown_options_dropdown` (`dropdown_id`),
  CONSTRAINT `fk_tm_dropdown_options_dropdown` FOREIGN KEY (`dropdown_id`) REFERENCES `table_management_dropdowns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=210 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `table_management_dropdowns`
--

DROP TABLE IF EXISTS `table_management_dropdowns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_management_dropdowns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_id` int NOT NULL,
  `table_id` int DEFAULT NULL,
  `dropdown_name` varchar(150) NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_tm_dropdowns_module` (`module_id`),
  KEY `fk_tm_dropdowns_table` (`table_id`),
  CONSTRAINT `fk_tm_dropdowns_module` FOREIGN KEY (`module_id`) REFERENCES `table_management_modules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tm_dropdowns_table` FOREIGN KEY (`table_id`) REFERENCES `table_management_tables` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `table_management_fields`
--

DROP TABLE IF EXISTS `table_management_fields`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_management_fields` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_id` int NOT NULL,
  `table_id` int DEFAULT NULL,
  `field_label` varchar(200) NOT NULL,
  `field_key` varchar(150) NOT NULL,
  `field_type` varchar(100) NOT NULL DEFAULT 'Text',
  `is_required` tinyint(1) NOT NULL DEFAULT '0',
  `is_visible` tinyint(1) NOT NULL DEFAULT '1',
  `show_add` tinyint(1) NOT NULL DEFAULT '1',
  `show_edit` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `is_system_field` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_tm_fields_module` (`module_id`),
  KEY `fk_tm_fields_table` (`table_id`),
  CONSTRAINT `fk_tm_fields_module` FOREIGN KEY (`module_id`) REFERENCES `table_management_modules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tm_fields_table` FOREIGN KEY (`table_id`) REFERENCES `table_management_tables` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=339 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `table_management_modules`
--

DROP TABLE IF EXISTS `table_management_modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_management_modules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_name` varchar(100) NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `module_name` (`module_name`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `table_management_settings`
--

DROP TABLE IF EXISTS `table_management_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_management_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_id` int NOT NULL,
  `table_id` int DEFAULT NULL,
  `rows_per_page` int NOT NULL DEFAULT '10',
  `allow_search` tinyint(1) NOT NULL DEFAULT '1',
  `allow_export` tinyint(1) NOT NULL DEFAULT '1',
  `allow_print` tinyint(1) NOT NULL DEFAULT '1',
  `show_actions` tinyint(1) NOT NULL DEFAULT '1',
  `default_sort` varchar(100) NOT NULL DEFAULT 'latest_first',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_tm_settings_module` (`module_id`),
  KEY `fk_tm_settings_table` (`table_id`),
  CONSTRAINT `fk_tm_settings_module` FOREIGN KEY (`module_id`) REFERENCES `table_management_modules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tm_settings_table` FOREIGN KEY (`table_id`) REFERENCES `table_management_tables` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `table_management_tables`
--

DROP TABLE IF EXISTS `table_management_tables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `table_management_tables` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_id` int NOT NULL,
  `table_name` varchar(150) NOT NULL,
  `display_name` varchar(150) NOT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_tm_tables_module` (`module_id`),
  CONSTRAINT `fk_tm_tables_module` FOREIGN KEY (`module_id`) REFERENCES `table_management_modules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tacs_entries`
--

DROP TABLE IF EXISTS `tacs_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tacs_entries` (
  `id` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `project_id` int DEFAULT NULL,
  `source_module` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `source_table` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `intervention_id` int DEFAULT NULL,
  `type_of_consultancy` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `date_of_engagement` date DEFAULT NULL,
  `expert_institution` text COLLATE utf8mb4_general_ci,
  `customer_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sex` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `customer_address_text` text COLLATE utf8mb4_general_ci,
  `customer_address_meta` longtext COLLATE utf8mb4_general_ci,
  `advice_count` decimal(12,2) DEFAULT '0.00',
  `means_of_verification` longtext COLLATE utf8mb4_general_ci,
  `photos` longtext COLLATE utf8mb4_general_ci,
  `staff_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `custom_fields` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tacs_project_id` (`project_id`),
  KEY `idx_tacs_intervention_id` (`intervention_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tacs_types`
--

DROP TABLE IF EXISTS `tacs_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tacs_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `target_settings`
--

DROP TABLE IF EXISTS `target_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `target_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `year` int NOT NULL DEFAULT '2026',
  `kpi_key` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `kpi_label` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `annual_target` decimal(15,2) DEFAULT '0.00',
  `q1_target` decimal(15,2) DEFAULT '0.00',
  `q2_target` decimal(15,2) DEFAULT '0.00',
  `q3_target` decimal(15,2) DEFAULT '0.00',
  `q4_target` decimal(15,2) DEFAULT '0.00',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_module_year_kpi` (`module_name`,`year`,`kpi_key`)
) ENGINE=InnoDB AUTO_INCREMENT=1171 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `technology_promotion_entries`
--

DROP TABLE IF EXISTS `technology_promotion_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `technology_promotion_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activity_date` date NOT NULL,
  `technology_promoted` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `technology_generator` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mode_of_promotion` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activity_title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activity_venue_address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `venue_mode` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `venue_display_text` text COLLATE utf8mb4_unicode_ci,
  `venue_province` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `venue_municipality` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `venue_barangay` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `venue_lat` decimal(10,7) DEFAULT NULL,
  `venue_lng` decimal(10,7) DEFAULT NULL,
  `customer_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_address` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `sex` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'N/A',
  `means_of_verification` text COLLATE utf8mb4_unicode_ci,
  `staff_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `custom_fields` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `source_module` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_project_id` int DEFAULT NULL,
  `source_intervention_id` int DEFAULT NULL,
  `source_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tp_activity_date` (`activity_date`),
  KEY `idx_tp_project_name` (`project_name`),
  KEY `idx_tp_mode` (`mode_of_promotion`),
  KEY `idx_tp_municipality` (`venue_municipality`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `technology_promotion_photos`
--

DROP TABLE IF EXISTS `technology_promotion_photos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `technology_promotion_photos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entry_id` int NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_data` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tp_photo_entry` (`entry_id`),
  CONSTRAINT `fk_tp_photo_entry` FOREIGN KEY (`entry_id`) REFERENCES `technology_promotion_entries` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `technology_rollout`
--

DROP TABLE IF EXISTS `technology_rollout`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `technology_rollout` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quarter` tinyint NOT NULL,
  `unit_center` varchar(150) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'DOST-PANGASINAN',
  `name_of_technology_transferred` text COLLATE utf8mb4_general_ci NOT NULL,
  `technology_generator` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `mode_of_transfer` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `is_dost_developed_funded` tinyint(1) NOT NULL DEFAULT '0',
  `date_transferred` date DEFAULT NULL,
  `activity_title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `activity_date` date DEFAULT NULL,
  `activity_venue` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `institution_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `institution_address` text COLLATE utf8mb4_general_ci NOT NULL,
  `address_mode` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_manual_text` text COLLATE utf8mb4_general_ci,
  `address_display_text` text COLLATE utf8mb4_general_ci,
  `address_province` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_municipality` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_barangay` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address_lat` decimal(10,7) DEFAULT NULL,
  `address_lng` decimal(10,7) DEFAULT NULL,
  `classification` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `representative_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `representative_designation` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sex` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `project_id` int DEFAULT NULL,
  `intervention_id` int DEFAULT NULL,
  `source_module` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'technology_rollout',
  `source_label` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `name_of_staff` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `custom_fields` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_technology_rollout_intervention_id` (`intervention_id`),
  KEY `idx_tr_activity_date` (`activity_date`),
  KEY `idx_tr_quarter` (`quarter`),
  KEY `idx_tr_municipality` (`address_municipality`),
  KEY `idx_tr_mode_transfer` (`mode_of_transfer`),
  KEY `idx_tr_dost_flag` (`is_dost_developed_funded`),
  CONSTRAINT `fk_technology_rollout_intervention` FOREIGN KEY (`intervention_id`) REFERENCES `cest_interventions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `technology_training_entries`
--

DROP TABLE IF EXISTS `technology_training_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `technology_training_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `program` varchar(255) COLLATE utf8mb4_general_ci DEFAULT '',
  `province` varchar(255) COLLATE utf8mb4_general_ci DEFAULT 'PANGASINAN',
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `title` text COLLATE utf8mb4_general_ci NOT NULL,
  `venue_address` text COLLATE utf8mb4_general_ci NOT NULL,
  `venue_meta` longtext COLLATE utf8mb4_general_ci,
  `no_of_firms` int DEFAULT '0',
  `participants_female` int DEFAULT '0',
  `participants_male` int DEFAULT '0',
  `senior_female` int DEFAULT '0',
  `senior_male` int DEFAULT '0',
  `ip_female` int DEFAULT '0',
  `ip_male` int DEFAULT '0',
  `fourps_female` int DEFAULT '0',
  `fourps_male` int DEFAULT '0',
  `pwd_female` int DEFAULT '0',
  `pwd_male` int DEFAULT '0',
  `firms_sucs_heis_lgus_count` int DEFAULT '0',
  `firms_associations_list` text COLLATE utf8mb4_general_ci,
  `trainor_affiliation` text COLLATE utf8mb4_general_ci,
  `program_project_unit` text COLLATE utf8mb4_general_ci,
  `cost_dost` decimal(14,2) DEFAULT '0.00',
  `cost_partner_agency` decimal(14,2) DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `total_female` int DEFAULT NULL,
  `total_male` int DEFAULT NULL,
  `total_participants` int DEFAULT NULL,
  `project_id` int DEFAULT NULL,
  `intervention_id` int DEFAULT NULL,
  `source_module` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'technology_training',
  `source_label` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `name_of_staff` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `custom_fields` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_tt_cest_training` (`intervention_id`,`source_module`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `technology_training_programs`
--

DROP TABLE IF EXISTS `technology_training_programs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `technology_training_programs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tp_modes`
--

DROP TABLE IF EXISTS `tp_modes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tp_modes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3818 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tp_projects`
--

DROP TABLE IF EXISTS `tp_projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tp_projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=1044 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_accomplishments`
--

DROP TABLE IF EXISTS `user_accomplishments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_accomplishments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `module_key` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `accomplishment_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_user_accomplishments_user` (`user_id`),
  CONSTRAINT `fk_user_accomplishments_user` FOREIGN KEY (`user_id`) REFERENCES `user_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_accounts`
--

DROP TABLE IF EXISTS `user_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `middle_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `suffix` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `username` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `contact_number` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role` enum('superadmin','admin','staff') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'staff',
  `status` enum('active','inactive') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'active',
  `position` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `office` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_by` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `can_manage_dropdowns` tinyint(1) NOT NULL DEFAULT '0',
  `avatar_json` longtext COLLATE utf8mb4_general_ci,
  `assigned` int NOT NULL DEFAULT '0',
  `completed` int NOT NULL DEFAULT '0',
  `pending` int NOT NULL DEFAULT '0',
  `edited_records` int NOT NULL DEFAULT '0',
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_assignments`
--

DROP TABLE IF EXISTS `user_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `module_key` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `status` enum('pending','ongoing','completed','cancelled') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending',
  `assigned_by` varchar(150) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_user_assignments_user` (`user_id`),
  CONSTRAINT `fk_user_assignments_user` FOREIGN KEY (`user_id`) REFERENCES `user_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_audit_logs`
--

DROP TABLE IF EXISTS `user_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `actor_user_id` int DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `module_key` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `old_value` longtext COLLATE utf8mb4_general_ci,
  `new_value` longtext COLLATE utf8mb4_general_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_user_audit_user` (`user_id`),
  KEY `fk_user_audit_actor` (`actor_user_id`),
  CONSTRAINT `fk_user_audit_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `user_accounts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_audit_user` FOREIGN KEY (`user_id`) REFERENCES `user_accounts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_permissions`
--

DROP TABLE IF EXISTS `user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `page_key` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `can_view` tinyint(1) NOT NULL DEFAULT '0',
  `can_add` tinyint(1) NOT NULL DEFAULT '0',
  `can_edit` tinyint(1) NOT NULL DEFAULT '0',
  `can_delete` tinyint(1) NOT NULL DEFAULT '0',
  `can_export` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_page` (`user_id`,`page_key`),
  CONSTRAINT `fk_user_permissions_user` FOREIGN KEY (`user_id`) REFERENCES `user_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_special_permissions`
--

DROP TABLE IF EXISTS `user_special_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_special_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `manage_dropdowns` tinyint(1) NOT NULL DEFAULT '0',
  `manage_users` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `fk_user_special_permissions_user` FOREIGN KEY (`user_id`) REFERENCES `user_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-08  8:45:30
-- Ensure user account password column can store hashed passwords
ALTER TABLE `user_accounts` MODIFY `password` VARCHAR(255) NOT NULL;
