use soroban_sdk::{contracttype, Address, Env, String, Vec, Symbol, U256};
use crate::utils::storage::{StorageUtils, EntityType};

/// Dynamic NFT credential with evolution capabilities
#[contracttype]
#[derive(Clone)]
pub struct DynamicNFT {
    pub token_id: u64,
    pub owner: Address,
    pub creator: Address,
    pub base_uri: String,
    pub current_level: u8,
    pub experience_points: u64,
    pub achievements: Vec<u64>, // Achievement IDs that contribute to evolution
    pub visual_traits: VisualTraits,
    pub evolution_history: Vec<EvolutionRecord>,
    pub metadata_ipfs: String,
    pub created_at: u64,
    pub last_evolved: u64,
    pub evolution_stage: EvolutionStage,
}

/// Visual traits for NFT representation
#[contracttype]
#[derive(Clone)]
pub struct VisualTraits {
    pub background: u8,
    pub border: u8,
    pub emblem: u8,
    pub glow_effect: u8,
    pub special_effects: Vec<u8>,
    pub rarity_tier: RarityTier,
}

/// Evolution stages
#[contracttype]
#[derive(Clone, PartialEq)]
pub enum EvolutionStage {
    Novice = 0,
    Apprentice = 1,
    Expert = 2,
    Master = 3,
    Grandmaster = 4,
    Legendary = 5,
}

/// Rarity tiers for visual representation
#[contracttype]
#[derive(Clone, PartialEq)]
pub enum RarityTier {
    Common = 0,
    Uncommon = 1,
    Rare = 2,
    Epic = 3,
    Legendary = 4,
    Mythic = 5,
}

/// Evolution record for tracking changes
#[contracttype]
#[derive(Clone)]
pub struct EvolutionRecord {
    pub timestamp: u64,
    pub from_stage: EvolutionStage,
    pub to_stage: EvolutionStage,
    pub achievement_id: u64,
    pub ipfs_hash: String,
}

/// Achievement requirements for evolution
#[contracttype]
#[derive(Clone)]
pub struct EvolutionRequirement {
    pub stage: EvolutionStage,
    pub required_xp: u64,
    pub required_achievements: Vec<u64>,
    pub visual_trait_changes: VisualTraits,
}

/// Storage keys for dynamic NFT system
#[contracttype]
pub enum DynamicNFTKey {
    Token(u64),
    OwnerTokens(Address),
    TokenCount,
    EvolutionRequirements(EvolutionStage),
    FusionRecipe(u64, u64), // token1_id, token2_id
    AchievementBadge(u64),
}

/// ERC-721 compatible events
#[contracttype]
pub enum NFTEvent {
    Transfer(Address, Address, u64), // from, to, token_id
    Evolution(u64, EvolutionStage, EvolutionStage), // token_id, from_stage, to_stage
    AchievementUnlocked(u64, u64), // token_id, achievement_id
    Fusion(u64, u64, u64), // token1_id, token2_id, new_token_id
}

/// Create a new dynamic NFT credential
pub fn mint_dynamic_nft(
    env: &Env,
    creator: Address,
    recipient: Address,
    base_uri: String,
    initial_metadata: String,
) -> u64 {
    creator.require_auth();

    let admin: Address = env.storage().instance().get(&Symbol::new(env, "admin"));
    if creator != admin {
        panic!("Unauthorized creator");
    }

    let token_id = StorageUtils::get_next_id(env, EntityType::Credential);
    let timestamp = env.ledger().timestamp();

    let visual_traits = VisualTraits {
        background: 0,
        border: 0,
        emblem: 0,
        glow_effect: 0,
        special_effects: Vec::new(env),
        rarity_tier: RarityTier::Common,
    };

    let nft = DynamicNFT {
        token_id,
        owner: recipient.clone(),
        creator: creator.clone(),
        base_uri,
        current_level: 1,
        experience_points: 0,
        achievements: Vec::new(env),
        visual_traits,
        evolution_history: Vec::new(env),
        metadata_ipfs: initial_metadata,
        created_at: timestamp,
        last_evolved: timestamp,
        evolution_stage: EvolutionStage::Novice,
    };

    // Store NFT
    env.storage().persistent().set(&DynamicNFTKey::Token(token_id), &nft);
    
    // Update owner's token list
    let mut owner_tokens = get_owner_tokens(env, recipient.clone());
    owner_tokens.push_back(token_id);
    env.storage().persistent().set(&DynamicNFTKey::OwnerTokens(recipient), &owner_tokens);

    // Update token count
    env.storage().instance().set(&DynamicNFTKey::TokenCount, &token_id);

    // Emit transfer event
    env.events().publish(
        (Symbol::new(env, "Transfer"),),
        (Address::from_contract_id(&[0; 32]), recipient, token_id)
    );

    token_id
}

/// Evolve NFT based on new achievement
pub fn evolve_nft(
    env: &Env,
    token_id: u64,
    achievement_id: u64,
    new_metadata: String,
) -> bool {
    let mut nft: DynamicNFT = env.storage().persistent()
        .get(&DynamicNFTKey::Token(token_id))
        .unwrap_or_else(|| panic!("NFT not found"));

    // Check if achievement already unlocked
    if nft.achievements.contains(&achievement_id) {
        return false;
    }

    // Add achievement
    nft.achievements.push_back(achievement_id);
    
    // Calculate XP reward for achievement
    let xp_reward = calculate_achievement_xp(env, achievement_id);
    nft.experience_points += xp_reward;

    let old_stage = nft.evolution_stage.clone();
    let timestamp = env.ledger().timestamp();

    // Check for evolution
    if let Some(new_stage) = check_evolution_requirements(env, nft.current_level, nft.experience_points) {
        nft.evolution_stage = new_stage.clone();
        nft.current_level += 1;
        nft.last_evolved = timestamp;

        // Update visual traits
        update_visual_traits(env, &mut nft, &new_stage);

        // Create evolution record
        let evolution_record = EvolutionRecord {
            timestamp,
            from_stage: old_stage,
            to_stage: new_stage.clone(),
            achievement_id,
            ipfs_hash: new_metadata.clone(),
        };
        nft.evolution_history.push_back(evolution_record);

        // Emit evolution event
        env.events().publish(
            (Symbol::new(env, "Evolution"),),
            (token_id, old_stage, new_stage)
        );
    }

    // Update metadata
    nft.metadata_ipfs = new_metadata;

    // Store updated NFT
    env.storage().persistent().set(&DynamicNFTKey::Token(token_id), &nft);

    // Emit achievement unlock event
    env.events().publish(
        (Symbol::new(env, "AchievementUnlocked"),),
        (token_id, achievement_id)
    );

    true
}

/// Fuse two NFTs to create a new one
pub fn fuse_nfts(
    env: &Env,
    token1_id: u64,
    token2_id: u64,
    recipient: Address,
) -> u64 {
    let nft1: DynamicNFT = env.storage().persistent()
        .get(&DynamicNFTKey::Token(token1_id))
        .unwrap_or_else(|| panic!("NFT 1 not found"));
    
    let nft2: DynamicNFT = env.storage().persistent()
        .get(&DynamicNFTKey::Token(token2_id))
        .unwrap_or_else(|| panic!("NFT 2 not found"));

    // Check ownership
    if nft1.owner != recipient || nft2.owner != recipient {
        panic!("Recipient must own both NFTs");
    }

    // Create new fused NFT
    let new_token_id = StorageUtils::get_next_id(env, EntityType::Credential);
    let timestamp = env.ledger().timestamp();

    // Combine visual traits
    let fused_traits = fuse_visual_traits(&nft1.visual_traits, &nft2.visual_traits);

    // Combine achievements
    let mut combined_achievements = nft1.achievements;
    for achievement in nft2.achievements {
        if !combined_achievements.contains(&achievement) {
            combined_achievements.push_back(achievement);
        }
    }

    let fused_nft = DynamicNFT {
        token_id: new_token_id,
        owner: recipient.clone(),
        creator: nft1.creator,
        base_uri: format!("{}-fused", nft1.base_uri),
        current_level: (nft1.current_level + nft2.current_level) / 2 + 1,
        experience_points: (nft1.experience_points + nft2.experience_points) / 2,
        achievements: combined_achievements,
        visual_traits: fused_traits,
        evolution_history: Vec::new(env),
        metadata_ipfs: format!("fused-{}", timestamp),
        created_at: timestamp,
        last_evolved: timestamp,
        evolution_stage: determine_fusion_stage(&nft1.evolution_stage, &nft2.evolution_stage),
    };

    // Store new NFT
    env.storage().persistent().set(&DynamicNFTKey::Token(new_token_id), &fused_nft);
    
    // Update owner's token list
    let mut owner_tokens = get_owner_tokens(env, recipient.clone());
    owner_tokens.push_back(new_token_id);
    env.storage().persistent().set(&DynamicNFTKey::OwnerTokens(recipient), &owner_tokens);

    // Burn original NFTs
    burn_nft(env, token1_id);
    burn_nft(env, token2_id);

    // Emit fusion event
    env.events().publish(
        (Symbol::new(env, "Fusion"),),
        (token1_id, token2_id, new_token_id)
    );

    new_token_id
}

/// Transfer NFT to new owner
pub fn transfer_nft(env: &Env, from: Address, to: Address, token_id: u64) {
    from.require_auth();

    let mut nft: DynamicNFT = env.storage().persistent()
        .get(&DynamicNFTKey::Token(token_id))
        .unwrap_or_else(|| panic!("NFT not found"));

    if nft.owner != from {
        panic!("Not the owner");
    }

    // Remove from old owner's tokens
    let mut from_tokens = get_owner_tokens(env, from.clone());
    let index = from_tokens.iter().position(|&id| id == token_id).unwrap_or_else(|| panic!("Token not found in owner's list"));
    from_tokens.remove(index as u32);
    env.storage().persistent().set(&DynamicNFTKey::OwnerTokens(from), &from_tokens);

    // Add to new owner's tokens
    let mut to_tokens = get_owner_tokens(env, to.clone());
    to_tokens.push_back(token_id);
    env.storage().persistent().set(&DynamicNFTKey::OwnerTokens(to), &to_tokens);

    // Update NFT owner
    nft.owner = to.clone();
    env.storage().persistent().set(&DynamicNFTKey::Token(token_id), &nft);

    // Emit transfer event
    env.events().publish(
        (Symbol::new(env, "Transfer"),),
        (from, to, token_id)
    );
}

/// Get NFT details
pub fn get_nft(env: &Env, token_id: u64) -> DynamicNFT {
    env.storage().persistent()
        .get(&DynamicNFTKey::Token(token_id))
        .unwrap_or_else(|| panic!("NFT not found"))
}

/// Get all tokens owned by an address
pub fn get_owner_tokens(env: &Env, owner: Address) -> Vec<u64> {
    env.storage().persistent()
        .get(&DynamicNFTKey::OwnerTokens(owner))
        .unwrap_or_else(|| Vec::new(env))
}

/// Get total token count
pub fn get_total_supply(env: &Env) -> u64 {
    env.storage().instance()
        .get(&DynamicNFTKey::TokenCount)
        .unwrap_or(0)
}

/// Calculate XP reward for an achievement
fn calculate_achievement_xp(env: &Env, achievement_id: u64) -> u64 {
    // This would typically fetch achievement data
    // For now, use a simple formula based on achievement ID
    100 + (achievement_id % 10) * 50
}

/// Check if NFT should evolve based on XP and level
fn check_evolution_requirements(env: &Env, current_level: u8, xp: u64) -> Option<EvolutionStage> {
    let xp_thresholds = [
        (0, EvolutionStage::Novice),
        (500, EvolutionStage::Apprentice),
        (1500, EvolutionStage::Expert),
        (3000, EvolutionStage::Master),
        (6000, EvolutionStage::Grandmaster),
        (10000, EvolutionStage::Legendary),
    ];

    for (threshold, stage) in xp_thresholds.iter().rev() {
        if xp >= *threshold {
            return Some(stage.clone());
        }
    }

    None
}

/// Update visual traits based on evolution stage
fn update_visual_traits(env: &Env, nft: &mut DynamicNFT, stage: &EvolutionStage) {
    match stage {
        EvolutionStage::Novice => {
            nft.visual_traits.rarity_tier = RarityTier::Common;
            nft.visual_traits.background = 1;
        }
        EvolutionStage::Apprentice => {
            nft.visual_traits.rarity_tier = RarityTier::Uncommon;
            nft.visual_traits.border = 1;
        }
        EvolutionStage::Expert => {
            nft.visual_traits.rarity_tier = RarityTier::Rare;
            nft.visual_traits.emblem = 1;
        }
        EvolutionStage::Master => {
            nft.visual_traits.rarity_tier = RarityTier::Epic;
            nft.visual_traits.glow_effect = 1;
        }
        EvolutionStage::Grandmaster => {
            nft.visual_traits.rarity_tier = RarityTier::Legendary;
            nft.visual_traits.special_effects.push_back(1);
        }
        EvolutionStage::Legendary => {
            nft.visual_traits.rarity_tier = RarityTier::Mythic;
            nft.visual_traits.special_effects.push_back(2);
        }
    }
}

/// Fuse visual traits from two NFTs
fn fuse_visual_traits(traits1: &VisualTraits, traits2: &VisualTraits) -> VisualTraits {
    let mut fused_special_effects = traits1.special_effects.clone();
    for effect in traits2.special_effects.iter() {
        if !fused_special_effects.contains(effect) {
            fused_special_effects.push_back(*effect);
        }
    }

    VisualTraits {
        background: (traits1.background + traits2.background) / 2,
        border: (traits1.border + traits2.border) / 2,
        emblem: (traits1.emblem + traits2.emblem) / 2,
        glow_effect: (traits1.glow_effect + traits2.glow_effect) / 2,
        special_effects: fused_special_effects,
        rarity_tier: if traits1.rarity_tier as u8 >= traits2.rarity_tier as u8 {
            traits1.rarity_tier.clone()
        } else {
            traits2.rarity_tier.clone()
        },
    }
}

/// Determine fusion result evolution stage
fn determine_fusion_stage(stage1: &EvolutionStage, stage2: &EvolutionStage) -> EvolutionStage {
    let stage1_value = *stage1 as u8;
    let stage2_value = *stage2 as u8;
    let fused_value = (stage1_value + stage2_value) / 2 + 1;
    
    match fused_value.min(5) {
        0 => EvolutionStage::Novice,
        1 => EvolutionStage::Apprentice,
        2 => EvolutionStage::Expert,
        3 => EvolutionStage::Master,
        4 => EvolutionStage::Grandmaster,
        _ => EvolutionStage::Legendary,
    }
}

/// Burn (destroy) an NFT
fn burn_nft(env: &Env, token_id: u64) {
    env.storage().persistent().remove(&DynamicNFTKey::Token(token_id));
}

/// Get NFT metadata URI
pub fn token_uri(env: &Env, token_id: u64) -> String {
    let nft = get_nft(env, token_id);
    format!("{}/{}", nft.base_uri, nft.metadata_ipfs)
}

/// Check if NFT exists
pub fn nft_exists(env: &Env, token_id: u64) -> bool {
    env.storage().persistent().has(&DynamicNFTKey::Token(token_id))
}

/// Get owner of NFT
pub fn owner_of(env: &Env, token_id: u64) -> Address {
    let nft = get_nft(env, token_id);
    nft.owner
}

/// Get balance of owner
pub fn balance_of(env: &Env, owner: Address) -> u64 {
    get_owner_tokens(env, owner).len()
}
