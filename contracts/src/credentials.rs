use soroban_sdk::{contracttype, Address, Env, String, Vec, Symbol};

#[contracttype]
pub enum CredentialKey {
    Credential(u64),
    UserCredentials(Address),
    CredentialCount,
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
    pub is_revoked: bool,  // Changed from is_verified → revocation is more useful
}

pub fn issue_credential(
    env: &Env,
    issuer: Address,
    recipient: Address,
    title: String,
    description: String,
    course_id: String,
    ipfs_hash: String,
) -> u64 {
    issuer.require_auth();

    let admin: Address = env.storage().instance().get(&Symbol::new(env, "admin"));
    if issuer != admin {
        panic!("Unauthorized issuer");
    }

    let mut count: u64 = env.storage().instance().get(&CredentialKey::CredentialCount).unwrap_or(0);
    count += 1;

    let credential = Credential {
        id: count,
        issuer: issuer.clone(),
        recipient: recipient.clone(),
        title,
        description,
        course_id,
        completion_date: env.ledger().timestamp(),
        ipfs_hash,
        is_revoked: false,
    };

    env.storage().persistent().set(&CredentialKey::Credential(count), &credential);

    // Integrate with user profile
    user_profile::add_credential(env, recipient.clone(), count);

    env.storage().instance().set(&CredentialKey::CredentialCount, &count);

    count
}

pub fn verify_credential(env: &Env, credential_id: u64) -> bool {
    let mut credential: Credential = env.storage().persistent()
        .get(&CredentialKey::Credential(credential_id))
        .unwrap_or_else(|| panic!("Credential not found"));

    if credential.is_revoked {
        return false;
    }

    // Here you can add more verification logic (e.g. check issuer signature, expiration)
    true
}

pub fn revoke_credential(env: &Env, credential_id: u64, revoker: Address) {
    revoker.require_auth();

    let admin: Address = env.storage().instance().get(&Symbol::new(env, "admin"));
    if revoker != admin {
        panic!("Only admin can revoke");
    }

    let mut credential: Credential = env.storage().persistent()
        .get(&CredentialKey::Credential(credential_id))
        .unwrap_or_else(|| panic!("Credential not found"));

    credential.is_revoked = true;
    env.storage().persistent().set(&CredentialKey::Credential(credential_id), &credential);
}

pub fn get_user_credentials(env: &Env, user: Address) -> Vec<u64> {
    env.storage().persistent()
        .get(&CredentialKey::UserCredentials(user))
        .unwrap_or(Vec::new(env))
}

pub fn get_credential(env: &Env, credential_id: u64) -> Credential {
    env.storage().persistent()
        .get(&CredentialKey::Credential(credential_id))
        .unwrap_or_else(|| panic!("Credential not found"))
}

pub fn get_credential_count(env: &Env) -> u64 {
    env.storage().instance()
        .get(&CredentialKey::CredentialCount)
        .unwrap_or(0)
}