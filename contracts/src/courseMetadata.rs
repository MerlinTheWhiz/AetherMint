#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec, Map, Symbol, U256};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CourseStatus {
    Active,
    Inactive,
    Archived,
    Suspended,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct CourseMetadata {
    pub id: String,
    pub instructor: Address,
    pub title: String,
    pub description: String,
    pub category: String,
    pub level: String, // beginner, intermediate, advanced
    pub duration: u64, // in hours
    pub price: u64, // in stroops
    pub prerequisites: Vec<String>,
    pub learning_objectives: Vec<String>,
    pub syllabus: String, // IPFS hash or JSON string
    pub thumbnail_url: String,
    pub tags: Vec<String>,
    pub language: String,
    pub certificate_enabled: bool,
    pub max_students: u64,
    pub current_enrollments: u64,
    pub rating: u32, // 0-100 (scaled from 0-5)
    pub review_count: u64,
    pub status: CourseStatus,
    pub created_at: u64,
    pub updated_at: u64,
    pub verification_hash: String, // SHA-256 hash for integrity
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct CourseCompletion {
    pub id: String,
    pub course_id: String,
    pub student: Address,
    pub completion_date: u64,
    pub final_grade: u32, // 0-100
    pub certificate_hash: String, // IPFS hash of certificate
    pub is_verified: bool,
    pub skills_acquired: Vec<String>,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct InstructorProfile {
    pub address: Address,
    pub name: String,
    pub bio: String,
    pub expertise: Vec<String>,
    pub experience_years: u32,
    pub rating: u32, // 0-100
    pub course_count: u64,
    pub total_students: u64,
    pub verification_status: bool,
    pub created_at: u64,
}

#[contracttype]
pub enum CourseMetadataKey {
    Course(String),
    Instructor(Address),
    CourseCount,
    InstructorCount,
    Completion(String),
    CompletionCount,
    Admin,
}

#[contract]
pub struct CourseMetadataContract;

#[contractimpl]
impl CourseMetadataContract {
    /// Initialize the contract with an admin address
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&CourseMetadataKey::Admin) {
            panic!("Contract already initialized");
        }
        
        env.storage().instance().set(&CourseMetadataKey::Admin, &admin);
        env.storage().instance().set(&CourseMetadataKey::CourseCount, &0u64);
        env.storage().instance().set(&CourseMetadataKey::InstructorCount, &0u64);
        env.storage().instance().set(&CourseMetadataKey::CompletionCount, &0u64);
    }

    /// Create and store course metadata
    pub fn create_course(
        env: Env,
        instructor: Address,
        title: String,
        description: String,
        category: String,
        level: String,
        duration: u64,
        price: u64,
        prerequisites: Vec<String>,
        learning_objectives: Vec<String>,
        syllabus: String,
        thumbnail_url: String,
        tags: Vec<String>,
        language: String,
        certificate_enabled: bool,
        max_students: u64,
    ) -> String {
        // Check if instructor exists, create if not
        if !env.storage().instance().has(&CourseMetadataKey::Instructor(instructor.clone())) {
            Self::create_instructor_profile(env, instructor.clone());
        }

        let course_count: u64 = env.storage().instance()
            .get(&CourseMetadataKey::CourseCount)
            .unwrap_or(0);
        
        let course_id = format!("course_{}", course_count + 1);
        let timestamp = env.ledger().timestamp();
        
        // Create verification hash
        let verification_data = format!("{}{}{}{}{}", title, description, instructor, price, timestamp);
        let verification_hash = Self::generate_hash(env, verification_data);

        let course_metadata = CourseMetadata {
            id: course_id.clone(),
            instructor: instructor.clone(),
            title,
            description,
            category,
            level,
            duration,
            price,
            prerequisites,
            learning_objectives,
            syllabus,
            thumbnail_url,
            tags,
            language,
            certificate_enabled,
            max_students,
            current_enrollments: 0,
            rating: 0,
            review_count: 0,
            status: CourseStatus::Active,
            created_at: timestamp,
            updated_at: timestamp,
            verification_hash,
        };

        env.storage().instance().set(&CourseMetadataKey::Course(course_id.clone()), &course_metadata);
        env.storage().instance().set(&CourseMetadataKey::CourseCount, &(course_count + 1));

        // Update instructor course count
        let mut instructor_profile = Self::get_instructor_profile(env, instructor.clone());
        instructor_profile.course_count += 1;
        env.storage().instance().set(&CourseMetadataKey::Instructor(instructor), &instructor_profile);

        course_id
    }

    /// Update course metadata
    pub fn update_course(
        env: Env,
        course_id: String,
        instructor: Address,
        title: Option<String>,
        description: Option<String>,
        category: Option<String>,
        level: Option<String>,
        duration: Option<u64>,
        price: Option<u64>,
        prerequisites: Option<Vec<String>>,
        learning_objectives: Option<Vec<String>>,
        syllabus: Option<String>,
        thumbnail_url: Option<String>,
        tags: Option<Vec<String>>,
        language: Option<String>,
        certificate_enabled: Option<bool>,
        max_students: Option<u64>,
        status: Option<CourseStatus>,
    ) -> bool {
        let mut course_metadata: CourseMetadata = env.storage().instance()
            .get(&CourseMetadataKey::Course(course_id.clone()))
            .unwrap_or_else(|| panic!("Course not found"));

        // Verify instructor ownership
        if course_metadata.instructor != instructor {
            panic!("Only course instructor can update course");
        }

        // Update fields if provided
        if let Some(new_title) = title {
            course_metadata.title = new_title;
        }
        if let Some(new_description) = description {
            course_metadata.description = new_description;
        }
        if let Some(new_category) = category {
            course_metadata.category = new_category;
        }
        if let Some(new_level) = level {
            course_metadata.level = new_level;
        }
        if let Some(new_duration) = duration {
            course_metadata.duration = new_duration;
        }
        if let Some(new_price) = price {
            course_metadata.price = new_price;
        }
        if let Some(new_prerequisites) = prerequisites {
            course_metadata.prerequisites = new_prerequisites;
        }
        if let Some(new_learning_objectives) = learning_objectives {
            course_metadata.learning_objectives = new_learning_objectives;
        }
        if let Some(new_syllabus) = syllabus {
            course_metadata.syllabus = new_syllabus;
        }
        if let Some(new_thumbnail_url) = thumbnail_url {
            course_metadata.thumbnail_url = new_thumbnail_url;
        }
        if let Some(new_tags) = tags {
            course_metadata.tags = new_tags;
        }
        if let Some(new_language) = language {
            course_metadata.language = new_language;
        }
        if let Some(new_certificate_enabled) = certificate_enabled {
            course_metadata.certificate_enabled = new_certificate_enabled;
        }
        if let Some(new_max_students) = max_students {
            course_metadata.max_students = new_max_students;
        }
        if let Some(new_status) = status {
            course_metadata.status = new_status;
        }

        course_metadata.updated_at = env.ledger().timestamp();

        // Update verification hash
        let verification_data = format!("{}{}{}{}{}", 
            course_metadata.title, 
            course_metadata.description, 
            course_metadata.instructor, 
            course_metadata.price, 
            course_metadata.updated_at
        );
        course_metadata.verification_hash = Self::generate_hash(env, verification_data);

        env.storage().instance().set(&CourseMetadataKey::Course(course_id), &course_metadata);
        true
    }

    /// Verify course authenticity
    pub fn verify_course(env: Env, course_id: String) -> bool {
        let course_metadata: CourseMetadata = env.storage().instance()
            .get(&CourseMetadataKey::Course(course_id.clone()))
            .unwrap_or_else(|| panic!("Course not found"));

        // Recreate verification hash and compare
        let verification_data = format!("{}{}{}{}{}", 
            course_metadata.title, 
            course_metadata.description, 
            course_metadata.instructor, 
            course_metadata.price, 
            course_metadata.updated_at
        );
        let expected_hash = Self::generate_hash(env, verification_data);

        expected_hash == course_metadata.verification_hash
    }

    /// Get course metadata
    pub fn get_course(env: Env, course_id: String) -> CourseMetadata {
        env.storage().instance()
            .get(&CourseMetadataKey::Course(course_id))
            .unwrap_or_else(|| panic!("Course not found"))
    }

    /// Get instructor profile
    pub fn get_instructor_profile(env: Env, instructor: Address) -> InstructorProfile {
        env.storage().instance()
            .get(&CourseMetadataKey::Instructor(instructor))
            .unwrap_or_else(|| panic!("Instructor profile not found"))
    }

    /// Create instructor profile
    fn create_instructor_profile(env: Env, instructor: Address) {
        let profile = InstructorProfile {
            address: instructor.clone(),
            name: String::from_str(&env, "Unnamed Instructor"),
            bio: String::from_str(&env, ""),
            expertise: Vec::new(&env),
            experience_years: 0,
            rating: 0,
            course_count: 0,
            total_students: 0,
            verification_status: false,
            created_at: env.ledger().timestamp(),
        };

        env.storage().instance().set(&CourseMetadataKey::Instructor(instructor), &profile);
    }

    /// Record course completion
    pub fn record_completion(
        env: Env,
        course_id: String,
        student: Address,
        final_grade: u32,
        certificate_hash: String,
        skills_acquired: Vec<String>,
    ) -> String {
        // Verify course exists
        let course_metadata: CourseMetadata = env.storage().instance()
            .get(&CourseMetadataKey::Course(course_id.clone()))
            .unwrap_or_else(|| panic!("Course not found"));

        let completion_count: u64 = env.storage().instance()
            .get(&CourseMetadataKey::CompletionCount)
            .unwrap_or(0);

        let completion_id = format!("completion_{}", completion_count + 1);
        let completion = CourseCompletion {
            id: completion_id.clone(),
            course_id: course_id.clone(),
            student: student.clone(),
            completion_date: env.ledger().timestamp(),
            final_grade,
            certificate_hash,
            is_verified: false,
            skills_acquired,
        };

        env.storage().instance().set(&CourseMetadataKey::Completion(completion_id.clone()), &completion);
        env.storage().instance().set(&CourseMetadataKey::CompletionCount, &(completion_count + 1));

        // Update course enrollment count
        let mut updated_course = course_metadata;
        updated_course.current_enrollments += 1;
        env.storage().instance().set(&CourseMetadataKey::Course(course_id), &updated_course);

        // Update instructor total students
        let mut instructor_profile = Self::get_instructor_profile(env, updated_course.instructor);
        instructor_profile.total_students += 1;
        env.storage().instance().set(&CourseMetadataKey::Instructor(updated_course.instructor), &instructor_profile);

        completion_id
    }

    /// Verify course completion
    pub fn verify_completion(env: Env, completion_id: String) -> bool {
        let mut completion: CourseCompletion = env.storage().instance()
            .get(&CourseMetadataKey::Completion(completion_id.clone()))
            .unwrap_or_else(|| panic!("Completion record not found"));

        completion.is_verified = true;
        env.storage().instance().set(&CourseMetadataKey::Completion(completion_id), &completion);

        true
    }

    /// Get course completion record
    pub fn get_completion(env: Env, completion_id: String) -> CourseCompletion {
        env.storage().instance()
            .get(&CourseMetadataKey::Completion(completion_id))
            .unwrap_or_else(|| panic!("Completion record not found"))
    }

    /// Get student's course completions
    pub fn get_student_completions(env: Env, student: Address) -> Vec<String> {
        // This is a simplified implementation
        // In production, you'd maintain an index of student completions
        Vec::new(&env)
    }

    /// Get instructor's courses
    pub fn get_instructor_courses(env: Env, instructor: Address) -> Vec<String> {
        // This is a simplified implementation
        // In production, you'd maintain an index of instructor courses
        Vec::new(&env)
    }

    /// Get total course count
    pub fn get_course_count(env: Env) -> u64 {
        env.storage().instance()
            .get(&CourseMetadataKey::CourseCount)
            .unwrap_or(0)
    }

    /// Get total completion count
    pub fn get_completion_count(env: Env) -> u64 {
        env.storage().instance()
            .get(&CourseMetadataKey::CompletionCount)
            .unwrap_or(0)
    }

    /// Generate simple hash (in production, use proper cryptographic hash)
    fn generate_hash(env: Env, data: String) -> String {
        // Simple hash implementation for demonstration
        // In production, use SHA-256 or similar
        let mut hash = 0u64;
        for byte in data.into_bytes() {
            hash = hash.wrapping_mul(31).wrapping_add(byte as u64);
        }
        format!("{:x}", hash)
    }

    /// Rate a course
    pub fn rate_course(env: Env, course_id: String, rater: Address, rating: u32) -> bool {
        if rating > 100 {
            panic!("Rating must be between 0 and 100");
        }

        let mut course_metadata: CourseMetadata = env.storage().instance()
            .get(&CourseMetadataKey::Course(course_id.clone()))
            .unwrap_or_else(|| panic!("Course not found"));

        // Simple rating calculation (in production, store individual ratings)
        course_metadata.review_count += 1;
        course_metadata.rating = ((course_metadata.rating * (course_metadata.review_count - 1) + rating) / course_metadata.review_count) as u32;

        env.storage().instance().set(&CourseMetadataKey::Course(course_id), &course_metadata);
        true
    }
}
