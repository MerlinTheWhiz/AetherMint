#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec};

pub mod progress;
pub mod event_logger;
pub mod user_profile;
#[cfg(test)]
mod progress_test;
#[cfg(test)]
mod event_logger_test;
#[cfg(test)]
mod user_profile_test;
pub mod eventLogger;
pub mod courseMetadata;
pub mod syncCoordination;
#[cfg(test)]
mod progress_test;
#[cfg(test)]
mod courseMetadata_test;
#[cfg(test)]
mod syncCoordination_test;


#[contracttype]
pub enum DataKey {
    Credential(u64),
    CredentialCount,
    Admin,
}

#[contracttype]
pub struct Credential {
    pub id: u64,
    pub issuer: Address,
    pub recipient: Address,
    pub title: String,
    pub description: String,
    pub course_id: String,
    pub completion_date: u64,
    pub ipfs_hash: String,
    pub is_verified: bool,
}

#[contracttype]
pub struct Course {
    pub id: String,
    pub instructor: Address,
    pub title: String,
    pub description: String,
    pub price: u64,
    pub is_active: bool,
}

#[contracttype]
pub struct Profile {
    pub owner: Address,
    pub credentials: Vec<u64>,
    pub achievements: Vec<u64>,
    pub reputation: u64,
}

#[contract]
pub struct AetherMintContract;

#[contractimpl]
impl AetherMintContract {
    /// Initialize the contract with an admin address
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Contract already initialized");
        }
        
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::CredentialCount, &0u64);
    }

    /// Issue a new credential
    pub fn issue_credential(
        env: Env,
        issuer: Address,
        recipient: Address,
        title: String,
        description: String,
        course_id: String,
        ipfs_hash: String,
    ) -> u64 {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("Admin not found"));

        if issuer != admin {
            panic!("Only admin can issue credentials");
        }

        let count: u64 = env.storage().instance()
            .get(&DataKey::CredentialCount)
            .unwrap_or(0);
        let credential_id = count + 1;

        let credential = Credential {
            id: credential_id,
            issuer: issuer.clone(),
            recipient: recipient.clone(),
            title,
            description,
            course_id,
            completion_date: env.ledger().timestamp(),
            ipfs_hash,
            is_verified: false,
        };

        env.storage().instance().set(&DataKey::Credential(credential_id), &credential);
        env.storage().instance().set(&DataKey::CredentialCount, &credential_id);

        credential_id
    }

    /// Verify a credential
    pub fn verify_credential(env: Env, credential_id: u64) -> bool {
        let _admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("Admin not found"));
        
        let mut credential: Credential = env.storage().instance()
            .get(&DataKey::Credential(credential_id))
            .unwrap_or_else(|| panic!("Credential not found"));

        credential.is_verified = true;
        env.storage().instance().set(&DataKey::Credential(credential_id), &credential);

        true
    }

    /// Get credential details
    pub fn get_credential(env: Env, credential_id: u64) -> Credential {
        env.storage().instance()
            .get(&DataKey::Credential(credential_id))
            .unwrap_or_else(|| panic!("Credential not found"))
    }

    /// Create a new course
    pub fn create_course(
        env: Env,
        instructor: Address,
        title: String,
        description: String,
        price: u64,
    ) -> String {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("Admin not found"));

        if instructor != admin {
            panic!("Only admin can create courses");
        }

        let course_id = String::from_str(&env, "default_course_id");
        let course = Course {
            id: course_id.clone(),
            instructor: instructor.clone(),
            title,
            description,
            price,
            is_active: true,
        };

        // Store course in persistent storage
        env.storage().instance().set(&DataKey::Credential(env.ledger().timestamp()), &course);

        // Store course (simplified - in production would use proper storage)


        course_id
    }

    /// Get user profile
    pub fn get_profile(env: Env, user: Address) -> Profile {
        env.storage().instance()
            .get(&user)
            .unwrap_or_else(|| Profile {
                owner: user.clone(),
                credentials: Vec::new(&env),
                achievements: Vec::new(&env),
                reputation: 0,
            })
    }

    /// Get total credential count
    pub fn get_credential_count(env: Env) -> u64 {
        env.storage().instance()
            .get(&DataKey::CredentialCount)
            .unwrap_or(0)
    }
}
