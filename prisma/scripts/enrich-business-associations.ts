import fs from "fs"
import path from "path"

type RuleRecord = {
  id: string
  topic?: string
  subtopic?: string
  title: string
  prompt_question?: string
  rule_statement?: string
  keywords?: string[]
  application_example?: string
  common_trap?: string
  priority?: string
  how_to_apply?: string[]
  common_traps?: { title: string; explanation: string }[]
  exam_tip?: string
}

type SubjectFile = {
  subject: string
  version?: number
  rule_count?: number
  rules: RuleRecord[]
}

type TrapItem = {
  title: string
  explanation: string
}

function cleanText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim()
}

function splitRuleIntoElements(ruleStatement: string): string[] {
  const text = cleanText(ruleStatement)
  if (!text) return []

  const pieces = text
    .split(/;|\.\s+(?=[A-Z])|,\s+(?=(?:and\s+)?(?:the\s+)?[a-z])/)
    .map((part) => cleanText(part))
    .filter(Boolean)

  const deduped: string[] = []
  for (const piece of pieces) {
    if (!deduped.includes(piece)) deduped.push(piece)
  }

  return deduped.slice(0, 6)
}

function genericHowToApply(rule: RuleRecord): string[] {
  const title = cleanText(rule.title)
  const prompt = cleanText(rule.prompt_question)
  const statement = cleanText(rule.rule_statement)
  const example = cleanText(rule.application_example)
  const elements = splitRuleIntoElements(statement)

  const steps: string[] = []

  steps.push(
    `Start with the precise issue: ${prompt || `when does ${title.toLowerCase()} apply`}?`
  )

  if (elements.length > 0) {
    steps.push(
      `Break the rule into its controlling parts and test them one at a time: ${elements.join("; ")}.`
    )
  } else {
    steps.push(
      "State the black letter rule accurately, then separate it into the legal requirements the facts must satisfy."
    )
  }

  steps.push(
    "Match the legally important facts to each requirement. Explain why each fact helps or hurts application of the rule."
  )

  if (example) {
    steps.push(`Use this model application pattern: ${example}`)
  } else {
    steps.push(
      "After analyzing the facts, state whether the rule is satisfied, not satisfied, or uncertain because a key fact is missing."
    )
  }

  steps.push(
    "Finish with a direct conclusion and mention any exception, limitation, notice issue, consent issue, approval issue, or procedural requirement that could change the result."
  )

  return steps.slice(0, 5)
}

function genericTrap(rule: RuleRecord): TrapItem[] {
  const title = cleanText(rule.title)

  return [
    {
      title: "Element-by-element analysis",
      explanation: `A common mistake with ${title} is reciting the rule generally but not tying each required element to the specific facts.`,
    },
    {
      title: "Do not jump to conclusion",
      explanation:
        "Bar answers lose points when they jump straight to the outcome without showing the legal reasoning step by step.",
    },
  ]
}

const FAMILY_BY_ID: Record<string, string> = {
  ba_agency_creation: "agency_creation",
  ba_agency_types: "principal_types",
  ba_actual_authority_express: "actual_authority_express",
  ba_actual_authority_implied: "actual_authority_implied",
  ba_apparent_authority: "apparent_authority",
  ba_inherent_agency_power: "inherent_agency_power",
  ba_agency_by_estoppel: "agency_estoppel",
  ba_ratification: "ratification",
  ba_agent_liability_disclosed_principal: "agent_liability_disclosed",
  ba_agent_liability_undisclosed_or_partial: "agent_liability_undisclosed_partial",
  ba_principal_liability_authorized_contracts: "principal_contract_liability",
  ba_agent_implied_warranty_authority: "implied_warranty_authority",
  ba_termination_actual_authority: "termination_actual_authority",
  ba_termination_apparent_authority: "termination_apparent_authority",
  ba_vicarious_liability_tort_general: "respondeat_superior",
  ba_scope_of_employment: "scope_of_employment",
  ba_frolic_detour: "frolic_detour",
  ba_intentional_torts_employer_liability: "intentional_torts_scope",
  ba_independent_contractor_general: "independent_contractor_rule",
  ba_independent_contractor_exceptions: "independent_contractor_exceptions",
  ba_principal_direct_liability: "principal_direct_liability",
  ba_agent_fiduciary_duty_loyalty: "agent_duty_loyalty",
  ba_agent_fiduciary_duty_care: "agent_duty_care",
  ba_agent_duty_obedience: "agent_duty_obedience",
  ba_principal_duties_agent: "principal_duties_to_agent",

  ba_gp_creation: "gp_formation",
  ba_partnership_profit_sharing: "gp_profit_sharing",
  ba_gp_no_formality: "gp_no_formality",
  ba_partner_authority_general: "partner_authority",
  ba_partner_authority_outside_ordinary_course: "partner_authority_outside",
  ba_partner_joint_and_several_liability: "partner_joint_several_liability",
  ba_partner_tort_liability: "partner_tort_liability",
  ba_partner_fiduciary_duty_loyalty: "partner_duty_loyalty",
  ba_partner_fiduciary_duty_care: "partner_duty_care",
  ba_partner_management_rights: "partner_management_rights",
  ba_partner_profit_loss_sharing: "partner_profit_loss_sharing",
  ba_partner_indemnification: "partner_indemnification",
  ba_transfer_of_partnership_interest: "transfer_partnership_interest",
  ba_partnership_property: "partnership_property",
  ba_dissociation_general: "partnership_dissociation",
  ba_wrongful_dissociation: "wrongful_dissociation",
  ba_dissolution_winding_up: "partnership_dissolution",
  ba_events_causing_dissolution: "events_causing_dissolution",
  ba_partnership_liability_after_dissolution: "partnership_liability_after_dissolution",
  ba_llp_general: "llp",

  ba_lp_creation: "lp_formation",
  ba_lp_general_partner_liability: "lp_general_partner_liability",
  ba_lp_limited_partner_liability: "lp_limited_partner_liability",
  ba_lp_control_limitation: "lp_control_limitation",
  ba_lp_economic_rights: "lp_economic_rights",
  ba_lp_disclosure_requirements: "lp_disclosure_requirements",

  ba_corp_formation: "corp_formation",
  ba_articles_of_incorporation: "articles_of_incorporation",
  ba_bylaws: "bylaws",
  ba_de_facto_corporation: "de_facto_corporation",
  ba_corporation_by_estoppel: "corporation_by_estoppel",
  ba_promoter_contracts: "promoter_contracts",
  ba_corporate_adoption_preincorporation: "corporate_adoption_preincorporation",
  ba_promoter_fiduciary_duties: "promoter_fiduciary_duties",
  ba_share_subscriptions: "share_subscriptions",
  ba_piercing_veil_general: "piercing_veil",
  ba_piercing_factors: "piercing_factors",
  ba_reverse_piercing_note: "reverse_piercing",
  ba_board_management: "board_management",
  ba_board_meetings_notice_quorum: "board_meetings_notice_quorum",
  ba_board_action_written_consent: "board_action_written_consent",
  ba_board_committee: "board_committee",
  ba_director_objection: "director_objection",
  ba_officer_authority: "officer_authority",
  ba_officer_liability_corporate_obligations: "officer_liability_contract",
  ba_shareholder_meetings_annual_special: "shareholder_meetings",
  ba_shareholder_quorum_voting: "shareholder_quorum_voting",
  ba_proxy_voting: "proxy_voting",
  ba_voting_trusts: "voting_trusts",
  ba_shareholder_voting_agreements: "shareholder_voting_agreements",
  ba_cumulative_voting: "cumulative_voting",
  ba_class_voting: "class_voting",
  ba_close_corporation_agreements: "close_corporation_agreements",
  ba_director_duty_of_care: "director_duty_of_care",
  ba_business_judgment_rule: "business_judgment_rule",
  ba_director_duty_of_loyalty: "director_duty_of_loyalty",
  ba_conflict_of_interest_transaction: "conflict_transaction",
  ba_corporate_opportunity_doctrine: "corporate_opportunity",
  ba_officer_fiduciary_duties: "officer_fiduciary_duties",
  ba_controlling_shareholder_duties: "controlling_shareholder_duties",
  ba_close_corporation_minority_oppression: "minority_oppression",
  ba_distributions_general: "distributions_general",
  ba_director_liability_unlawful_distribution: "director_liability_unlawful_distribution",
  ba_shares_and_authorized_capital: "authorized_shares",
  ba_preemptive_rights: "preemptive_rights",
  ba_treasury_shares: "treasury_shares",
  ba_shareholder_inspection_rights: "inspection_rights",
  ba_shareholder_direct_action: "direct_action",
  ba_shareholder_derivative_action: "derivative_action",
  ba_derivative_action_requirements: "derivative_action_requirements",
  ba_demand_requirement: "demand_requirement",
  ba_special_litigation_committee: "special_litigation_committee",
  ba_class_actions_shareholders: "shareholder_class_actions",

  ba_llc_formation: "llc_formation",
  ba_operating_agreement: "operating_agreement",
  ba_llc_member_managed: "llc_member_managed",
  ba_llc_manager_managed: "llc_manager_managed",
  ba_llc_member_liability: "llc_member_liability",
  ba_llc_manager_authority: "llc_manager_authority",
  ba_llc_fiduciary_duties: "llc_fiduciary_duties",
  ba_llc_transferability: "llc_transferability",
  ba_llc_dissociation_dissolution: "llc_dissociation_dissolution",

  ba_merger_general: "merger_general",
  ba_sale_substantially_all_assets: "sale_substantially_all_assets",
  ba_amend_articles: "amend_articles",
  ba_dissolution_corporation: "corporate_dissolution",
  ba_judicial_dissolution: "judicial_dissolution",
  ba_parent_subsidiary: "parent_subsidiary",
}

function getFamily(rule: RuleRecord): string {
  return FAMILY_BY_ID[rule.id] || "generic"
}

function buildHowToApply(rule: RuleRecord): string[] {
  const family = getFamily(rule)
  const example = cleanText(rule.application_example)

  switch (family) {
    case "agency_creation":
      return [
        "Ask whether the principal manifested assent for another person to act on the principal's behalf.",
        "Then ask whether the alleged agent consented to act and whether the principal had the right to control the agent's conduct.",
        "Use the facts to show acting on behalf of the principal, not just cooperation between two people.",
        `Apply the relationship facts carefully. ${example || "An agency can exist even without a formal written contract if assent and control are present."}`,
        "Conclude whether an agency relationship existed at the time of the disputed act.",
      ]

    case "principal_types":
      return [
        "Ask what the third party knew at the time of contracting.",
        "Decide whether the third party knew both that a principal existed and who the principal was.",
        "Classify the principal as disclosed, partially disclosed, or undisclosed based on that knowledge.",
        "Then connect that classification to contract liability for both the principal and the agent.",
        "Conclude by stating who can be held liable on the contract and why.",
      ]

    case "actual_authority_express":
      return [
        "Start with communications from the principal to the agent, not to the third party.",
        "Identify the exact instruction, permission, or authorization the principal gave the agent.",
        "Compare the act taken by the agent to the scope of that express authorization.",
        "If the act exceeded the instruction, explain precisely where authority stopped.",
        "Conclude whether the agent had express actual authority for this specific act.",
      ]

    case "actual_authority_implied":
      return [
        "Begin with the express authority or position the agent already had.",
        "Ask whether the disputed act was reasonably necessary to carry out that authority or was customary for that role.",
        "Use surrounding facts such as past practice, industry custom, job title, and ordinary business needs.",
        "Distinguish acts that are incidental from acts that are extraordinary or forbidden.",
        "Conclude whether implied actual authority extended to the act in question.",
      ]

    case "apparent_authority":
      return [
        "Focus on the principal's manifestations to the third party, not the agent's own claims.",
        "Ask whether those manifestations would make a reasonable third party believe the agent had authority.",
        "Identify the source of that belief, such as title, prior dealings, position, communications, or conduct.",
        "Then ask whether the third party actually and reasonably relied on that appearance of authority.",
        "Conclude whether the principal is bound because apparent authority existed at the time of the transaction.",
      ]

    case "inherent_agency_power":
      return [
        "Identify the agent's position and the kind of act the agent performed.",
        "Ask whether the act was usual or incidental to that position, especially in dealing with an undisclosed principal.",
        "Use the facts to show whether the transaction looked ordinary from the third party's perspective.",
        "Explain why the principal may still be bound despite private restrictions on the agent.",
        "Conclude whether the older inherent-agency-power doctrine applies.",
      ]

    case "agency_estoppel":
      return [
        "Ask whether the principal intentionally or carelessly created the appearance that another person had authority.",
        "Then identify the third party's reliance and explain why that reliance was justified.",
        "Show the detriment suffered because the third party acted in reliance on the appearance of authority.",
        "Keep the analysis focused on fairness and reliance, not actual consent between principal and agent.",
        "Conclude whether the principal is estopped from denying the agency relationship.",
      ]

    case "ratification":
      return [
        "Start with the unauthorized act and identify exactly what the agent did without authority.",
        "Ask whether the principal later affirmed the act or accepted its benefits.",
        "Then ask whether the principal had knowledge of the material facts and had capacity to ratify.",
        "Check whether ratification would unfairly prejudice third-party rights that arose before ratification.",
        "Conclude whether the act became binding retroactively through ratification.",
      ]

    case "agent_liability_disclosed":
      return [
        "First classify the principal as disclosed at the time of contracting.",
        "Then ask whether the agent acted with authority and whether the contract showed representative capacity.",
        "Look closely at the signature line and contract wording to see whether the agent signed personally or as a representative.",
        "If authority was missing or the agent agreed to be bound personally, explain why liability can still attach.",
        "Conclude whether the agent is personally liable on the contract.",
      ]

    case "agent_liability_undisclosed_partial":
      return [
        "Begin by classifying the principal as undisclosed or partially disclosed.",
        "Then explain that the third party did not receive full disclosure at the time of contracting.",
        "Apply the rule that the agent is generally liable unless the parties agreed otherwise.",
        "If the principal is later discovered, explain whether the third party may elect to pursue the principal, the agent, or both where allowed.",
        "Conclude who remains liable on the contract.",
      ]

    case "principal_contract_liability":
      return [
        "Identify the theory that could bind the principal: actual authority, apparent authority, inherent agency power, estoppel, or ratification.",
        "Apply the facts separately under the strongest theory instead of blending the doctrines together.",
        "Show exactly how the agent's act fits one binding theory or why no theory fits.",
        "If authority is disputed, explain who received the relevant manifestation and when.",
        "Conclude whether the principal is bound on the contract.",
      ]

    case "implied_warranty_authority":
      return [
        "Ask whether the agent purported to act for a principal without actual authority.",
        "Then determine whether the principal is not bound because the authority was missing.",
        "Explain what representation of authority the agent effectively made to the third party.",
        "Identify the loss caused by the third party's reliance on that false authority.",
        "Conclude whether the agent is liable for breach of the implied warranty of authority.",
      ]

    case "termination_actual_authority":
      return [
        "Identify the source of the agent's actual authority before the alleged termination.",
        "Then ask what ended that authority: revocation, renunciation, completion, lapse of time, death, incapacity, or changed circumstances.",
        "Match the timing carefully. The key question is whether authority still existed when the agent acted.",
        "Separate actual authority from apparent authority because ending one does not automatically end the other.",
        "Conclude whether actual authority had terminated before the transaction or tort occurred.",
      ]

    case "termination_apparent_authority":
      return [
        "Start from the third party's perspective and ask whether continued reliance remained reasonable.",
        "Identify what notice or changed facts reached the third party and when.",
        "Explain whether the principal took sufficient steps to inform prior customers or counterparties.",
        "Distinguish termination of actual authority from termination of apparent authority.",
        "Conclude whether apparent authority still lingered or was effectively cut off.",
      ]

    case "respondeat_superior":
      return [
        "First determine whether the tortfeasor was an employee rather than an independent contractor.",
        "Then ask whether the tort occurred within the scope of employment.",
        "Use the facts to show whether the employee was performing assigned work or furthering the employer's business at the time.",
        "If the conduct looks personal, explain whether it was only a minor deviation or a true departure from the job.",
        "Conclude whether the employer is vicariously liable.",
      ]

    case "scope_of_employment":
      return [
        "Ask whether the conduct was the kind of work the employee was hired to perform.",
        "Then check whether it happened substantially within authorized time and space limits.",
        "Next ask whether the employee was at least partly motivated by a purpose to serve the employer.",
        "Use the facts to distinguish job-related conduct from purely personal conduct.",
        "Conclude whether the act falls inside or outside the scope of employment.",
      ]

    case "frolic_detour":
      return [
        "Identify the employee's assigned route or work objective before the deviation occurred.",
        "Then measure the size and purpose of the deviation from the employer's business.",
        "A small personal sidetrack is usually a detour, but a substantial personal mission is a frolic.",
        "If the employee later returned to the employer's business, explain when scope of employment resumed.",
        "Conclude whether liability attaches at the moment of the tort.",
      ]

    case "intentional_torts_scope":
      return [
        "Start by identifying the intentional tort and the employee's job role.",
        "Ask whether force or confrontation was job-related, foreseeable, or motivated in part by serving the employer.",
        "Use the facts to distinguish work-related aggression from a purely personal dispute.",
        "Explain why the employment context either makes the act foreseeable or takes it outside the scope of employment.",
        "Conclude whether the employer is vicariously liable for the intentional tort.",
      ]

    case "independent_contractor_rule":
      return [
        "Begin by determining whether the tortfeasor was truly an independent contractor rather than an employee.",
        "Focus on the principal's right to control the manner and means of the work.",
        "If the principal lacked that control, explain why the default rule is no vicarious liability.",
        "Then check separately whether an exception might still impose liability.",
        "Conclude whether the principal escapes liability under the general rule.",
      ]

    case "independent_contractor_exceptions":
      return [
        "Start with the general rule that there is usually no vicarious liability for an independent contractor.",
        "Then test the recognized exceptions one by one: negligent selection, inherently dangerous activity, nondelegable duty, or retained control.",
        "Use the facts to explain why the activity or duty falls within a specific exception.",
        "Do not just list exceptions. Tie one concrete exception to the actual facts.",
        "Conclude whether the principal is liable despite the independent-contractor relationship.",
      ]

    case "principal_direct_liability":
      return [
        "Separate direct liability from vicarious liability at the start of your analysis.",
        "Ask whether the principal itself acted negligently in hiring, supervising, retaining, authorizing, or ratifying wrongful conduct.",
        "Point to facts showing what the principal knew or should have known.",
        "Explain how that negligence or ratification caused the plaintiff's injury.",
        "Conclude whether the principal is directly liable for its own conduct.",
      ]

    case "agent_duty_loyalty":
      return [
        "Identify the agency relationship and the transaction or conduct being challenged.",
        "Ask whether the agent acted for personal benefit instead of solely for the principal's benefit in matters connected to the agency.",
        "Look for self-dealing, secret profits, conflicts of interest, kickbacks, competition, or usurped opportunities.",
        "Then ask whether the principal gave informed consent after full disclosure.",
        "Conclude whether the agent breached the duty of loyalty and what remedy may follow.",
      ]

    case "agent_duty_care":
      return [
        "Identify the task the agent undertook for the principal.",
        "Ask what level of care, competence, and diligence a similar agent would use in those circumstances.",
        "Compare the agent's conduct to that standard using the facts, not vague labels.",
        "If the agent claimed special expertise, explain why the expected standard may be higher.",
        "Conclude whether the agent breached the duty of care.",
      ]

    case "agent_duty_obedience":
      return [
        "Start with the principal's lawful instructions and the scope of actual authority.",
        "Then compare the agent's conduct to those instructions.",
        "Explain precisely where the agent followed, exceeded, or ignored the principal's directions.",
        "Check whether the instruction was lawful because an agent need not obey unlawful commands.",
        "Conclude whether the duty of obedience was breached.",
      ]

    case "principal_duties_to_agent":
      return [
        "Identify the expense, liability, compensation, or cooperation problem between principal and agent.",
        "Ask whether the agent acted within authority and in the ordinary course of the agency relationship.",
        "If the agent seeks reimbursement or indemnification, connect the expense to authorized conduct.",
        "If the expense arose from the agent's own wrongful or unauthorized conduct, explain why recovery may be limited.",
        "Conclude what duty the principal owed and whether it was breached.",
      ]

    case "gp_formation":
    case "gp_profit_sharing":
    case "gp_no_formality":
      return [
        "Ask whether two or more persons were carrying on as co-owners a business for profit.",
        "Use objective facts such as profit sharing, control, contributions, and business conduct rather than labels alone.",
        "If profit sharing is present, analyze whether an exception explains it, such as wages, rent, debt repayment, or loan interest.",
        "Do not treat lack of formal filing or lack of intent to form a partnership as controlling.",
        "Conclude whether a general partnership arose by operation of law.",
      ]

    case "partner_authority":
      return [
        "Identify the act taken by the partner and the nature of the partnership's business.",
        "Ask whether the act was apparently for carrying on the partnership business in the ordinary course.",
        "If it was ordinary, explain why the partnership is bound unless the third party knew of a lack of authority.",
        "If it was not ordinary, move to the approval analysis instead of assuming authority.",
        "Conclude whether the partner's act bound the partnership.",
      ]

    case "partner_authority_outside":
      return [
        "Identify the challenged act and explain why it falls outside the ordinary course of the partnership business.",
        "Because the act is extraordinary, ask whether the other partners actually authorized it.",
        "Do not assume ordinary-course agency power applies to major asset sales or structural acts.",
        "Use the facts to show whether the required partner approval was or was not obtained.",
        "Conclude whether the partnership is bound.",
      ]

    case "partner_joint_several_liability":
      return [
        "First determine whether the obligation is a partnership obligation.",
        "If it is, explain that general partners are jointly and severally liable.",
        "Then distinguish external liability to the creditor from internal contribution rights among partners.",
        "Use the facts to show whether the claimant may pursue one partner, several partners, or the partnership itself.",
        "Conclude what liability each partner faces.",
      ]

    case "partner_tort_liability":
      return [
        "Identify the wrongful act and the partner who committed it.",
        "Ask whether the act occurred in the ordinary course of partnership business or with partnership authority.",
        "If yes, explain why the partnership is liable in addition to the individual wrongdoer.",
        "Then address whether the partners also face personal liability under general partnership rules.",
        "Conclude who is liable to the injured party.",
      ]

    case "partner_duty_loyalty":
      return [
        "Identify the partnership opportunity, benefit, adverse dealing, or competition at issue.",
        "Ask whether the partner personally benefited from partnership business or property without proper disclosure.",
        "Look for diversion of clients, secret profits, competing ventures, or transactions on behalf of an adverse interest.",
        "If there was consent or agreement modification, explain whether it is effective under the statute.",
        "Conclude whether the partner breached the duty of loyalty.",
      ]

    case "partner_duty_care":
      return [
        "Begin with the statutory partnership standard, which is usually gross negligence, reckless conduct, intentional misconduct, or knowing violation of law.",
        "Do not automatically use ordinary negligence as the measure.",
        "Match the partner's conduct to that heightened threshold using specific facts.",
        "Explain why the conduct either crosses or falls short of that threshold.",
        "Conclude whether the duty of care was breached.",
      ]

    case "partner_management_rights":
      return [
        "Identify whether the dispute concerns ordinary management or a matter outside the ordinary course.",
        "Apply the default rule that partners have equal management rights absent agreement otherwise.",
        "Use the facts to determine whether majority approval is enough or unanimity is required.",
        "Do not confuse management voting rules with authority to bind third parties.",
        "Conclude whether the action was validly approved inside the partnership.",
      ]

    case "partner_profit_loss_sharing":
      return [
        "Start with the partnership agreement, if any, because it can alter the default allocation rules.",
        "If there is no agreement, apply the default rule that profits are shared equally and losses follow profits.",
        "Do not assume capital contribution amounts control unless the agreement says so.",
        "Use the facts to separate internal allocation from outside creditor liability.",
        "Conclude how profits and losses are shared.",
      ]

    case "partner_indemnification":
      return [
        "Identify the payment, liability, or expense the partner is seeking to shift to the partnership.",
        "Ask whether it was incurred in the ordinary course of partnership business or to preserve partnership property.",
        "If the expense arose from unauthorized or wrongful conduct, explain why reimbursement may be denied.",
        "Separate reimbursement to the paying partner from contribution among partners.",
        "Conclude whether the partnership must indemnify or reimburse.",
      ]

    case "transfer_partnership_interest":
      return [
        "Identify exactly what the partner transferred: economic rights or full partner status.",
        "Apply the rule that a transferee usually gets only the transferable economic interest, not management rights.",
        "Ask whether the other partners consented to admission as a full partner.",
        "Do not confuse the right to receive distributions with the right to vote or manage.",
        "Conclude what rights the transferee actually acquired.",
      ]

    case "partnership_property":
      return [
        "Identify the property at issue and ask whether it was acquired by or for the partnership.",
        "If it is partnership property, explain that it belongs to the partnership entity, not the partners individually.",
        "Use title, source of funds, and business purpose facts to classify the property.",
        "Do not treat a partner's ownership interest as direct ownership of specific partnership assets.",
        "Conclude who owns and may control the property.",
      ]

    case "partnership_dissociation":
      return [
        "Start by distinguishing dissociation from dissolution because they are not the same issue.",
        "Identify the event that caused the partner to cease being associated with the business.",
        "Ask whether the partnership continues or whether the event also triggered winding up.",
        "Then identify the legal consequences for the departing partner and the continuing partnership.",
        "Conclude the partnership's status after the dissociation.",
      ]

    case "wrongful_dissociation":
      return [
        "Identify the term, undertaking, or contractual provision that the departing partner may have violated.",
        "Ask whether the dissociation occurred in a way that statute or agreement treats as wrongful.",
        "Distinguish wrongful dissociation from whether dissolution itself occurs.",
        "Then address damages or other consequences flowing from the wrongful departure.",
        "Conclude whether the dissociation was wrongful.",
      ]

    case "partnership_dissolution":
      return [
        "Identify the event that triggered dissolution and explain why the partnership has moved into winding up.",
        "State that after dissolution the partnership continues only for winding-up purposes.",
        "Then analyze what acts are appropriate to complete unfinished business, collect assets, and pay creditors.",
        "Separate winding-up authority from authority to start new ordinary business.",
        "Conclude what legal consequences follow from dissolution.",
      ]

    case "events_causing_dissolution":
      return [
        "Identify the event that allegedly triggered dissolution, such as express will, expiration of term, agreement event, or judicial decree.",
        "Ask whether the partnership is at will or for a term or undertaking, because that affects the analysis.",
        "Do not confuse a mere dissociation with an actual dissolution event.",
        "Use the facts to show whether winding up is required or the business may continue.",
        "Conclude whether dissolution occurred.",
      ]

    case "partnership_liability_after_dissolution":
      return [
        "Start by identifying whether the post-dissolution act was appropriate for winding up.",
        "If not, ask whether the third party lacked notice of the dissolution and the act would have bound the partnership before dissolution.",
        "Use filing and notice facts carefully because they can cut off lingering authority.",
        "Separate liability to third parties from internal claims among former partners.",
        "Conclude whether the partnership remains bound after dissolution.",
      ]

    case "llp":
      return [
        "Confirm whether the partnership properly filed the statement required for LLP status.",
        "If filing was proper, explain the liability shield created for partnership obligations.",
        "Then separate firm obligations from a partner's own wrongful acts or personal guarantees.",
        "Use the facts to show which liability is shielded and which is not.",
        "Conclude whether the partner has personal liability on these facts.",
      ]

    case "lp_formation":
      return [
        "Start with statutory filing because a limited partnership does not arise by conduct alone.",
        "Ask whether the required certificate or equivalent filing was made.",
        "Then identify the required structure, including at least one general partner and limited partner.",
        "Do not treat general-partnership default rules as enough to create an LP.",
        "Conclude whether a valid limited partnership was formed.",
      ]

    case "lp_general_partner_liability":
      return [
        "Identify the actor as a general partner in an LP, not a limited partner.",
        "Apply the rule that general partners usually manage the LP and are personally liable for LP obligations.",
        "Then ask whether the general partner is itself an entity that provides liability protection.",
        "Separate entity-level liability from any contract or tort liability analysis.",
        "Conclude whether personal liability attaches.",
      ]

    case "lp_limited_partner_liability":
      return [
        "Identify the actor as a limited partner and start with the rule of limited personal liability.",
        "Then ask whether the problem expects modern law, under which management participation alone usually does not destroy limited liability.",
        "If older law is implicated, analyze whether the conduct created control-based liability and misleading reliance.",
        "Separate management participation from personal guarantees or personal wrongful acts.",
        "Conclude whether the limited partner is personally liable.",
      ]

    case "lp_control_limitation":
      return [
        "Ask whether the problem is using the traditional control-based doctrine or modern statutory treatment.",
        "Under the traditional view, identify whether the limited partner substantially participated in control.",
        "Then ask whether a third party reasonably believed the limited partner was acting like a general partner.",
        "Under modern statutes, explain that control participation alone usually does not create personal liability.",
        "Conclude which rule governs and whether liability follows.",
      ]

    case "lp_economic_rights":
      return [
        "Identify the economic right being claimed, such as profits, losses, distributions, or transfer rights.",
        "Start with the partnership agreement because it usually controls the allocation.",
        "Separate economic rights from management rights, which limited partners usually do not hold by default.",
        "Use the facts to determine whether the claimant has only distribution rights or something more.",
        "Conclude what economic entitlement exists.",
      ]

    case "lp_disclosure_requirements":
      return [
        "Start with the statutory filing and naming requirements for the LP.",
        "Explain why public disclosure matters for third-party notice and entity recognition.",
        "Ask whether the LP properly complied with the required filings and public-record obligations.",
        "Then connect any failure to possible authority, notice, or entity-status problems.",
        "Conclude what legal effect the disclosure failure or compliance has.",
      ]

    case "corp_formation":
      return [
        "Identify whether the issue is valid formation or some later governance dispute.",
        "For valid formation, ask whether articles of incorporation were properly filed and the corporation came into existence as a separate legal entity.",
        "Do not analyze promoter or preincorporation liability as if the corporation already existed.",
        "Use the filing facts and any effective-date facts carefully.",
        "Conclude whether the corporation existed at the relevant time.",
      ]

    case "articles_of_incorporation":
      return [
        "Identify the filing document and ask whether it included the required statutory contents.",
        "Use the facts to test items such as corporate name, authorized shares, registered agent, and incorporator information.",
        "Distinguish charter provisions in the articles from internal governance rules in bylaws.",
        "If a missing or defective term matters, explain whether the formation is defective or merely incomplete under the statute.",
        "Conclude whether the articles satisfy the legal requirements.",
      ]

    case "bylaws":
      return [
        "Identify the bylaw provision and ask whether it governs an internal management issue.",
        "Then test whether the bylaw conflicts with the articles of incorporation or governing statute.",
        "Do not treat bylaws as filed charter documents.",
        "Use the facts to determine whether the relevant body had power to adopt or amend the bylaw.",
        "Conclude whether the bylaw provision is valid and effective.",
      ]

    case "de_facto_corporation":
      return [
        "Start by asking whether the jurisdiction still recognizes de facto corporation doctrine.",
        "If it does, test for a valid incorporation statute, a good-faith colorable attempt to comply, and actual use of the corporate form.",
        "Use the facts to show why organizers reasonably believed the corporation existed.",
        "Then connect that doctrine to whether personal liability should be avoided.",
        "Conclude whether de facto corporation status applies.",
      ]

    case "corporation_by_estoppel":
      return [
        "Ask whether the claimant dealt with the enterprise as if it were a corporation.",
        "If so, explain why the claimant may be estopped from later denying corporate existence.",
        "Keep the analysis equitable and fact-specific rather than purely technical.",
        "Do not confuse corporation by estoppel with de facto corporation doctrine.",
        "Conclude whether estoppel prevents personal-liability arguments.",
      ]

    case "promoter_contracts":
      return [
        "Identify the preincorporation contract and ask whether the corporation existed when it was made.",
        "Because it did not yet exist, analyze promoter liability first.",
        "Then ask whether the contract itself limited promoter liability or whether a later novation released the promoter.",
        "Do not assume later corporate adoption automatically releases the promoter.",
        "Conclude whether the promoter remains personally liable.",
      ]

    case "corporate_adoption_preincorporation":
      return [
        "Identify the preincorporation obligation and ask whether the later corporation expressly or impliedly adopted it.",
        "Use conduct such as acceptance of benefits or performance to test implied adoption.",
        "Explain that adoption can bind the corporation even though the promoter may still remain liable.",
        "Then ask separately whether a novation released the promoter.",
        "Conclude who is bound after adoption.",
      ]

    case "promoter_fiduciary_duties":
      return [
        "Identify the promoter transaction and the alleged undisclosed profit or conflict.",
        "Ask whether the promoter fully disclosed all material facts to the proper decision-makers or investors.",
        "Use the facts to analyze fairness and secret-profit concerns.",
        "Do not collapse promoter fiduciary-duty analysis into ordinary corporate fiduciary-duty analysis after formation.",
        "Conclude whether the promoter breached fiduciary duties.",
      ]

    case "share_subscriptions":
      return [
        "Identify whether the subscription was made before incorporation.",
        "Then ask whether the governing statute makes the subscription irrevocable for a specified period.",
        "Use the facts to determine whether revocation was effective or whether the subscription remained binding.",
        "Separate subscription enforceability from later share issuance mechanics.",
        "Conclude whether the subscriber is bound.",
      ]

    case "piercing_veil":
    case "piercing_factors":
    case "reverse_piercing":
      return [
        "Start from the presumption that the corporation is a separate legal entity.",
        "Then identify facts showing misuse of the entity, such as undercapitalization, commingling, failure to observe formalities, or fraud.",
        "Ask whether respecting the corporate form would sanction unfairness or injustice.",
        "If reverse piercing is raised, explain why courts are especially cautious because innocent creditors or shareholders may be harmed.",
        "Conclude whether veil piercing should or should not occur on these facts.",
      ]

    case "board_management":
      return [
        "Identify whether the challenged act falls within board authority or whether another valid arrangement displaced the default rule.",
        "Start with the rule that the corporation's business and affairs are managed by or under the direction of the board.",
        "Then ask whether statute, the articles, or a valid special arrangement alters that default.",
        "Do not confuse ownership by shareholders with management authority.",
        "Conclude who had power to manage the corporation on these facts.",
      ]

    case "board_meetings_notice_quorum":
      return [
        "Identify whether the board acted at a regular meeting, special meeting, or attempted meeting without proper procedure.",
        "Then test notice, quorum, and vote separately because each is its own requirement.",
        "Use the facts to determine the number of directors fixed and how many were present.",
        "Do not stop at quorum alone; ask whether the required affirmative vote was also obtained.",
        "Conclude whether valid board action occurred.",
      ]

    case "board_action_written_consent":
      return [
        "Ask whether the directors acted without a meeting by written consent.",
        "Then determine whether the governing statute requires unanimity for board written consent.",
        "Use the facts to see whether every director properly consented in the required form.",
        "Do not confuse director written consent rules with shareholder written consent rules.",
        "Conclude whether the board validly acted without a meeting.",
      ]

    case "board_committee":
      return [
        "Identify the committee action and the power the full board attempted to delegate.",
        "Ask whether the delegated task is one that statute allows a committee to perform.",
        "Use the facts to distinguish ordinary delegated functions from fundamental actions reserved to the full board.",
        "Do not assume a committee can do everything the board can do.",
        "Conclude whether the committee action was authorized.",
      ]

    case "director_objection":
      return [
        "Identify the board action taken while the director was present.",
        "Then ask whether the director objected, voted against, or abstained in a manner properly recorded.",
        "Use timing carefully because silence may count as assent.",
        "Do not assume private disagreement is enough without a proper recorded objection or dissent.",
        "Conclude whether the director is deemed to have assented.",
      ]

    case "officer_authority":
      return [
        "Identify whether the officer had actual authority, apparent authority, or both.",
        "For actual authority, look to bylaws, board resolutions, office, and prior corporate practice.",
        "For apparent authority, focus on the corporation's manifestations to the third party, not the officer's own statements.",
        "Then ask whether the transaction was ordinary for that officer's role.",
        "Conclude whether the corporation is bound by the officer's act.",
      ]

    case "officer_liability_contract":
      return [
        "Start by determining whether the corporation was disclosed at the time of contracting.",
        "Then ask whether the officer acted with authority and clearly indicated representative capacity.",
        "Look closely at how the officer signed and whether any personal guarantee was given.",
        "If authority was lacking or the signature was ambiguous, explain why personal liability may arise.",
        "Conclude whether the officer is personally liable.",
      ]

    case "shareholder_meetings":
      return [
        "Identify whether the meeting was annual or special.",
        "Then ask whether the proper person called it and whether notice satisfied statutory and bylaw requirements.",
        "For a special meeting, use the noticed purpose carefully and do not assume unrelated action is valid.",
        "Separate meeting-validity questions from later voting-threshold questions.",
        "Conclude whether the shareholder meeting was validly held.",
      ]

    case "shareholder_quorum_voting":
      return [
        "Separate quorum from the vote required to pass the matter.",
        "First ask whether the required number of shares entitled to vote was present or represented.",
        "Then ask whether the votes cast in favor satisfied the applicable statutory, charter, or bylaw threshold.",
        "Do not assume approval requires a majority of all outstanding shares unless the governing rule says so.",
        "Conclude whether valid shareholder action occurred.",
      ]

    case "proxy_voting":
      return [
        "Identify the proxy and ask whether it validly authorized another person to vote the shareholder's shares.",
        "Then determine whether the proxy was revocable or irrevocable under the coupled-with-an-interest rule.",
        "Use the facts to distinguish a proxy from a voting trust.",
        "If revocation is disputed, analyze timing and any valid irrevocability language.",
        "Conclude who had the right to vote the shares.",
      ]

    case "voting_trusts":
      return [
        "Ask whether the arrangement transferred legal title of the shares to a trustee for voting purposes.",
        "Then test the required formalities, such as a written trust arrangement and transfer of shares.",
        "Distinguish a voting trust from a mere shareholder voting agreement or proxy.",
        "Use the facts to separate voting control from retained economic ownership.",
        "Conclude whether a valid voting trust exists.",
      ]

    case "shareholder_voting_agreements":
      return [
        "Identify the agreement among shareholders and ask whether it is simply a voting agreement rather than a trust or proxy.",
        "Then ask whether it violates any statute or public policy.",
        "Do not require transfer of shares if the arrangement is only a voting agreement.",
        "Use the facts to determine whether the agreement is specifically enforceable.",
        "Conclude whether the voting agreement is valid.",
      ]

    case "cumulative_voting":
      return [
        "First ask whether cumulative voting is authorized by the governing statute or charter.",
        "Then calculate the available votes by multiplying the shares owned by the number of directors to be elected.",
        "Use the facts to determine whether the shareholder may concentrate votes on one or more candidates.",
        "Do not assume cumulative voting exists by default in every corporation.",
        "Conclude whether the voting method is valid and what result it allows.",
      ]

    case "class_voting":
      return [
        "Identify the corporate action and the share class allegedly affected.",
        "Ask whether the action directly changes legal rights of that class rather than merely causing indirect economic effects.",
        "Then determine whether separate class voting is required in addition to any overall shareholder vote.",
        "Use the facts to identify which class must approve the action.",
        "Conclude whether valid class approval occurred.",
      ]

    case "close_corporation_agreements":
      return [
        "Identify the shareholder agreement and the specific close-corporation control device involved.",
        "Ask whether the agreement reallocates management power, restricts transfer, resolves deadlock, or creates buy-sell rights.",
        "Then test whether the agreement is consistent with statute and enforceable in the close-corporation setting.",
        "Do not analyze the problem like a widely held public corporation if the facts show a close corporation.",
        "Conclude whether the special agreement is valid and what effect it has.",
      ]

    case "director_duty_of_care":
    case "business_judgment_rule":
      return [
        "Identify the board decision being challenged and the decision-making process used.",
        "Ask whether the directors acted in good faith, were adequately informed, and reasonably believed they were serving the corporation's best interests.",
        "If the process was informed and disinterested, explain why the business judgment rule may protect the decision.",
        "If the process was uninformed, conflicted, or in bad faith, explain why the presumption may be lost.",
        "Conclude whether liability should attach or whether the decision is protected from judicial second-guessing.",
      ]

    case "director_duty_of_loyalty":
    case "conflict_transaction":
    case "corporate_opportunity":
    case "officer_fiduciary_duties":
    case "controlling_shareholder_duties":
      return [
        "Start by identifying the personal interest, conflict, opportunity, or control abuse at issue.",
        "Ask whether the fiduciary put personal interests ahead of the corporation or minority owners.",
        "Then analyze cleansing facts such as full disclosure, approval by disinterested decision-makers, fairness, or valid rejection by the corporation.",
        "Do not use the business judgment rule as a shortcut in a loyalty problem.",
        "Conclude whether the fiduciary duty was breached and what remedy may follow.",
      ]

    case "minority_oppression":
      return [
        "Identify the conduct allegedly frustrating the minority owner's reasonable expectations in the close corporation.",
        "Use the facts to test exclusion from management, withholding distributions, termination of employment, or other freeze-out tactics.",
        "Do not analyze the dispute like an ordinary public-company governance matter.",
        "Then ask what equitable remedy fits, such as buyout, dissolution, or another court-ordered solution.",
        "Conclude whether minority oppression occurred.",
      ]

    case "distributions_general":
      return [
        "Identify the proposed distribution and start with the statutory solvency limits.",
        "Apply both the inability-to-pay-debts test and the balance-sheet style test, if both are relevant under the statute.",
        "Use the facts after giving effect to the distribution, not before it.",
        "Do not assume the board may pay dividends just because it wants to.",
        "Conclude whether the corporation may lawfully make the distribution.",
      ]

    case "director_liability_unlawful_distribution":
      return [
        "Start by asking whether the distribution itself was unlawful under the governing solvency rules.",
        "Then identify which directors voted for, assented to, or failed properly to object to the distribution.",
        "Ask whether those directors complied with the required standard of conduct.",
        "Separate liability to the corporation from any contribution or recourse among directors or shareholders.",
        "Conclude whether the directors face liability for the unlawful distribution.",
      ]

    case "authorized_shares":
      return [
        "Identify the number of shares authorized in the articles and the number the board attempted to issue.",
        "Ask whether the issuance stays within the authorized amount.",
        "Then analyze whether the board approved valid consideration for the issuance.",
        "Do not ignore charter limits on the corporation's power to issue stock.",
        "Conclude whether the share issuance was valid.",
      ]

    case "preemptive_rights":
      return [
        "Start by asking whether preemptive rights exist under the articles or governing statute.",
        "If they do, identify whether the challenged issuance is the kind of issuance that triggers those rights.",
        "Use the facts to determine the shareholder's proportional entitlement to purchase new shares.",
        "Do not assume preemptive rights exist by default unless the governing rule provides them.",
        "Conclude whether the shareholder had enforceable preemptive rights.",
      ]

    case "treasury_shares":
      return [
        "Identify whether the corporation reacquired previously issued shares.",
        "Then classify those shares as treasury shares or the equivalent under the governing statute.",
        "Explain their status while held by the corporation, including voting and dividend consequences.",
        "Use the facts to determine whether later reissuance is permitted.",
        "Conclude the legal status and effect of the treasury shares.",
      ]

    case "inspection_rights":
      return [
        "Identify the records the shareholder wants to inspect and whether they are basic records or more sensitive records.",
        "Then ask whether the shareholder complied with statutory procedure.",
        "If the records require a proper purpose, explain the stated purpose and whether it is reasonably related to shareholder interests.",
        "Do not treat all categories of records as equally available on the same terms.",
        "Conclude whether inspection must be allowed.",
      ]

    case "direct_action":
      return [
        "Start by classifying the injury as personal to the shareholder or belonging to the corporation.",
        "If the injury is individual, explain why the claim may be brought directly rather than derivatively.",
        "Use the facts to distinguish denial of voting, inspection, or oppression rights from generalized corporate injury.",
        "Do not force a derivative framework onto an individual-rights claim.",
        "Conclude whether the shareholder may proceed directly.",
      ]

    case "derivative_action":
    case "derivative_action_requirements":
    case "demand_requirement":
    case "special_litigation_committee":
      return [
        "Begin by classifying the claim as derivative because the injury belongs to the corporation.",
        "Then test the procedural requirements such as contemporaneous ownership, adequate representation, and demand rules.",
        "If demand or committee review is involved, analyze independence, good faith, and procedural sufficiency carefully.",
        "Do not skip the procedural hurdles and jump straight to the merits.",
        "Conclude whether the derivative action may proceed.",
      ]

    case "shareholder_class_actions":
      return [
        "Ask whether the shareholders suffered a common direct injury rather than an indirect injury to the corporation.",
        "If the injury is direct and shared across the class, explain why class treatment may be appropriate.",
        "Distinguish class treatment from derivative litigation, which belongs to the corporation.",
        "Use the facts to identify the common direct harm, such as misleading disclosures affecting a vote.",
        "Conclude whether the shareholders may proceed as a class.",
      ]

    case "llc_formation":
      return [
        "Start with statutory filing because an LLC is created by filing the certificate or articles required by statute.",
        "Then identify the LLC as a separate legal entity distinct from its members.",
        "Do not import corporation or partnership formation rules automatically.",
        "Use the facts to determine whether the required filing actually occurred and when the entity came into existence.",
        "Conclude whether a valid LLC was formed.",
      ]

    case "operating_agreement":
      return [
        "Identify the operating agreement provision at issue and what subject it governs.",
        "Then ask whether the operating agreement controls that issue or whether a nonwaivable statutory limit overrides it.",
        "Use the facts to determine management structure, allocation, transfer, or dissolution consequences under the agreement.",
        "Do not default to corporate analogies before checking the agreement.",
        "Conclude what rights and duties the operating agreement creates.",
      ]

    case "llc_member_managed":
      return [
        "Start by confirming that the LLC is member-managed rather than manager-managed.",
        "Then apply the rule that each member generally participates in management and may bind the LLC in the ordinary course.",
        "Ask whether the challenged act was ordinary or extraordinary for the LLC's business.",
        "Use the facts to determine whether the third party had notice of any lack of authority.",
        "Conclude whether the member had authority to bind the LLC.",
      ]

    case "llc_manager_managed":
      return [
        "Start by confirming that the LLC is manager-managed.",
        "Then explain that ordinary management authority belongs to the managers rather than the members.",
        "Use the operating agreement and statutory defaults to determine whether the challenged actor had power to act.",
        "Do not analyze passive members as if they automatically held ordinary management authority.",
        "Conclude who had management power on these facts.",
      ]

    case "llc_member_liability":
      return [
        "Begin with the rule that LLC members are generally not personally liable for LLC obligations solely because of membership or management participation.",
        "Then separate entity debts from personal guarantees, personal torts, or veil-piercing facts.",
        "Do not import general-partnership personal-liability rules into an LLC problem.",
        "Use the facts to identify whether any separate basis for personal liability exists.",
        "Conclude whether the member is personally liable.",
      ]

    case "llc_manager_authority":
      return [
        "Identify the manager and the transaction allegedly binding the LLC.",
        "Ask whether the manager had actual authority under the operating agreement or statutory defaults.",
        "Then analyze whether the manager also had apparent authority for an ordinary business transaction.",
        "Use the facts to determine whether the act was ordinary for the LLC and whether the third party reasonably relied.",
        "Conclude whether the LLC is bound.",
      ]

    case "llc_fiduciary_duties":
      return [
        "Identify whether the fiduciary is a member in a member-managed LLC or a manager in a manager-managed LLC.",
        "Then check the operating agreement and statute for the scope and modification of loyalty and care duties.",
        "Use the facts to identify self-dealing, usurpation, conflict, or care problems.",
        "Do not import corporate fiduciary rules without first checking LLC-specific law and agreement terms.",
        "Conclude whether fiduciary duties were breached.",
      ]

    case "llc_transferability":
      return [
        "Identify what interest was transferred and ask whether it is only an economic transferable interest or full membership status.",
        "Then apply the rule that a transferee usually gets distribution rights, not management rights, absent required consent.",
        "Use the operating agreement and statute to determine whether admission as a member occurred.",
        "Do not confuse assignment of economic rights with transfer of governance power.",
        "Conclude what rights the transferee acquired.",
      ]

    case "llc_dissociation_dissolution":
      return [
        "Start by distinguishing member dissociation from LLC dissolution because they are not automatically the same event.",
        "Then identify the triggering event under the statute or operating agreement.",
        "Ask whether the LLC continues or moves into winding up.",
        "Use the facts to determine post-dissociation rights, notice, and winding-up authority.",
        "Conclude the LLC's status and the legal consequences that follow.",
      ]

    case "merger_general":
      return [
        "Identify the merger and the constituent entities involved.",
        "Ask what approvals were required from the board, shareholders, and any affected share classes.",
        "Use the facts to test whether statutory merger procedures and filings were completed.",
        "Then explain that the surviving entity succeeds to rights and liabilities by operation of law.",
        "Conclude whether the merger was valid and what legal effect it has.",
      ]

    case "sale_substantially_all_assets":
      return [
        "Identify the asset disposition and ask whether it is outside the usual and regular course of business.",
        "If it is extraordinary, analyze the required board and shareholder approvals.",
        "Do not treat a major asset sale like an ordinary-course operational decision.",
        "Use the facts to determine whether the corporation disposed of all or substantially all assets.",
        "Conclude whether valid approval was required and obtained.",
      ]

    case "amend_articles":
      return [
        "Identify the proposed amendment to the articles and the change it would make.",
        "Ask whether board adoption, shareholder approval, and filing of articles of amendment were required.",
        "Use the facts to determine whether any statutory exception allowed board-only action.",
        "Do not confuse amendment of the articles with amendment of bylaws.",
        "Conclude whether the amendment became effective.",
      ]

    case "corporate_dissolution":
      return [
        "Identify the voluntary dissolution steps and ask whether the board and shareholders approved dissolution as required.",
        "Then test whether dissolution filings were properly made.",
        "After dissolution, analyze only winding-up acts such as paying creditors and distributing remaining assets.",
        "Do not treat the corporation as continuing ordinary business after dissolution.",
        "Conclude whether the corporation was properly dissolved and what follows.",
      ]

    case "judicial_dissolution":
      return [
        "Identify the statutory ground for judicial dissolution, such as deadlock, waste, fraud, illegality, or oppression.",
        "Use the facts to show why that ground is or is not satisfied.",
        "Then analyze whether dissolution is the appropriate remedy under the entity statute involved.",
        "Do not assume judicial dissolution exists on the same terms for every business form.",
        "Conclude whether a court should order dissolution.",
      ]

    case "parent_subsidiary":
      return [
        "Start with the presumption that parent and subsidiary are separate legal entities.",
        "Then ask whether some exception such as veil piercing, assumption of liability, or another recognized doctrine applies.",
        "Do not treat stock ownership alone as enough to impose liability.",
        "Use the facts to determine whether the parent actually misused the subsidiary form or separately assumed liability.",
        "Conclude whether the parent is liable for the subsidiary's obligation.",
      ]

    default:
      return genericHowToApply(rule)
  }
}

function buildCommonTraps(rule: RuleRecord): TrapItem[] {
  const family = getFamily(rule)
  const oldTrap = cleanText(rule.common_trap)

  switch (family) {
    case "actual_authority_express":
    case "actual_authority_implied":
    case "termination_actual_authority":
    case "agent_duty_obedience":
      return [
        {
          title: "Wrong perspective",
          explanation:
            "Students often analyze the third party's belief first. Actual authority is about what the principal communicated to the agent.",
        },
        {
          title: "Blending authority doctrines",
          explanation:
            "Do not mix actual authority with apparent authority. Keep principal-to-agent communications separate from principal-to-third-party manifestations.",
        },
      ]

    case "apparent_authority":
    case "termination_apparent_authority":
    case "officer_authority":
    case "llc_manager_authority":
      return [
        {
          title: "Using the agent's statements",
          explanation:
            "The classic mistake is relying on the agent's own claim of authority. Apparent authority must come from the principal's manifestations to the third party.",
        },
        {
          title: "Skipping reliance",
          explanation:
            "Even if the agent looked authorized, you still need reasonable third-party belief and reliance.",
        },
      ]

    case "ratification":
    case "principal_direct_liability":
      return [
        {
          title: "Ignoring knowledge",
          explanation:
            "Ratification requires knowledge of the material facts. Acceptance of benefits without that knowledge is not enough.",
        },
        {
          title: "Forgetting timing and capacity",
          explanation:
            "Students also forget that the principal must have capacity and that ratification cannot unfairly prejudice intervening third-party rights.",
        },
      ]

    case "gp_formation":
    case "gp_profit_sharing":
      return [
        {
          title: "Trusting labels",
          explanation:
            "Calling someone a lender, consultant, or friend does not decide the issue. Courts look to substance, especially co-ownership and profit sharing.",
        },
        {
          title: "Forgetting exceptions to profit sharing",
          explanation:
            "Profit sharing creates a presumption, but wages, debt repayment, rent, and loan interest may explain the payment without creating a partnership.",
        },
      ]

    case "partner_authority":
    case "partner_authority_outside":
      return [
        {
          title: "Misclassifying the act",
          explanation:
            "Students often assume a partner can always bind the partnership. The key question is whether the act was in the ordinary course of the partnership business.",
        },
        {
          title: "Ignoring the third party's knowledge",
          explanation:
            "If the third party knew the partner lacked authority, the partnership may not be bound even for an otherwise ordinary act.",
        },
      ]

    case "partner_duty_care":
      return [
        {
          title: "Using ordinary negligence",
          explanation:
            "Partnership duty-of-care questions often use the lower statutory threshold of gross negligence, recklessness, intentional misconduct, or knowing violation of law, not simple negligence.",
        },
        {
          title: "Forgetting the statute",
          explanation:
            "Students lose points by applying corporate-style fiduciary standards without checking the partnership statute.",
        },
      ]

    case "director_duty_of_care":
    case "business_judgment_rule":
      return [
        {
          title: "Outcome bias",
          explanation:
            "A bad business result does not itself prove a breach. The real issue is whether the directors were informed, disinterested, and acting in good faith.",
        },
        {
          title: "Skipping process",
          explanation:
            "Students often argue fairness of the result without analyzing the board's decision-making process.",
        },
      ]

    case "agent_duty_loyalty":
    case "partner_duty_loyalty":
    case "director_duty_of_loyalty":
    case "conflict_transaction":
    case "corporate_opportunity":
      return [
        {
          title: "Using the business judgment rule where it does not belong",
          explanation:
            "Duty-of-loyalty problems are not protected just because the fiduciary says the deal was good for the company.",
        },
        {
          title: "Forgetting cleansing mechanisms",
          explanation:
            "Students often ignore disclosure, disinterested approval, fairness, or rejection by the corporation, all of which may change the outcome.",
        },
      ]

    case "derivative_action":
    case "derivative_action_requirements":
    case "demand_requirement":
    case "special_litigation_committee":
      return [
        {
          title: "Choosing the wrong claim type",
          explanation:
            "Students often call a corporate injury a direct claim when it really belongs to the corporation and must be brought derivatively.",
        },
        {
          title: "Ignoring procedure",
          explanation:
            "Derivative claims are often lost on demand, standing, contemporaneous ownership, or committee-review issues rather than the merits.",
        },
      ]

    case "llc_formation":
    case "operating_agreement":
    case "llc_member_managed":
    case "llc_manager_managed":
    case "llc_member_liability":
    case "llc_manager_authority":
    case "llc_fiduciary_duties":
    case "llc_transferability":
    case "llc_dissociation_dissolution":
      return [
        {
          title: "Importing corporate rules automatically",
          explanation:
            "LLC problems often turn on the operating agreement and statutory defaults, not on corporate law by analogy.",
        },
        {
          title: "Ignoring management structure",
          explanation:
            "Authority analysis changes depending on whether the LLC is member-managed or manager-managed.",
        },
      ]

    case "piercing_veil":
    case "piercing_factors":
    case "reverse_piercing":
    case "parent_subsidiary":
      return [
        {
          title: "Treating one factor as enough",
          explanation:
            "No single veil-piercing factor is automatically decisive. Courts usually look at the total relationship between owner and entity.",
        },
        {
          title: "Skipping injustice analysis",
          explanation:
            "Undercapitalization or commingling alone is not always enough. You still need a strong unfairness or misuse rationale.",
        },
      ]

    case "distributions_general":
    case "director_liability_unlawful_distribution":
      return [
        {
          title: "Ignoring solvency tests",
          explanation:
            "Students often discuss dividends as if the board can simply choose to pay them. The legal issue is whether the corporation remains solvent under the statute.",
        },
        {
          title: "Forgetting director liability",
          explanation:
            "If the distribution is unlawful, the next issue is often whether directors who approved it breached the required standard of conduct.",
        },
      ]

    case "inspection_rights":
      return [
        {
          title: "Forgetting proper purpose",
          explanation:
            "Not all corporate records are equally available. Many requests require compliance with statutory procedure and a proper purpose.",
        },
        {
          title: "Treating all records the same",
          explanation:
            "Basic records and sensitive records often have different inspection standards.",
        },
      ]

    case "close_corporation_agreements":
    case "minority_oppression":
    case "controlling_shareholder_duties":
      return [
        {
          title: "Analyzing like a public company",
          explanation:
            "Close corporation disputes are often treated more like partnership disputes, especially when minority owners reasonably expected employment, management participation, or distributions.",
        },
        {
          title: "Ignoring equitable remedies",
          explanation:
            "The exam may want a buyout, dissolution, or another equitable solution, not just damages.",
        },
      ]

    case "merger_general":
    case "sale_substantially_all_assets":
    case "amend_articles":
    case "corporate_dissolution":
    case "judicial_dissolution":
    case "partnership_dissociation":
    case "wrongful_dissociation":
    case "partnership_dissolution":
    case "events_causing_dissolution":
    case "partnership_liability_after_dissolution":
      return [
        {
          title: "Skipping approval or trigger analysis",
          explanation:
            "Students often jump to the result without first identifying what event occurred and what approval, filing, or statutory trigger was actually required.",
        },
        {
          title: "Blending distinct structural steps",
          explanation:
            "Keep separate issues separate. Do not blend dissociation with dissolution, or board approval with shareholder approval, or winding up with ongoing business operations.",
        },
      ]

    default:
      if (oldTrap) {
        return [
          {
            title: "Common Trap",
            explanation: oldTrap,
          },
        ]
      }

      return genericTrap(rule)
  }
}


function buildExamTip(rule: RuleRecord): string {
  const family = getFamily(rule)
  const title = cleanText(rule.title)
  const topic = cleanText(rule.topic)
  const subtopic = cleanText(rule.subtopic)

  switch (family) {
    case "agency_creation":
      return "On an MEE agency issue, write the three core elements clearly: assent, acting on behalf of the principal, and control. Then attach each element to a fact."

    case "principal_types":
      return "When principal status is tested, classify the principal based on what the third party knew at the time of contracting. That classification usually controls who is liable on the contract."

    case "actual_authority_express":
    case "actual_authority_implied":
    case "termination_actual_authority":
      return "For actual authority, start with communications between the principal and agent. Do not use the third party's belief unless you are separately analyzing apparent authority."

    case "apparent_authority":
    case "termination_apparent_authority":
      return "For apparent authority, focus on the principal's manifestations to the third party and the reasonableness of the third party's reliance. The agent's own claim of authority is not enough."

    case "inherent_agency_power":
      return "If inherent agency power appears, treat it as an older protective doctrine. Use it carefully and explain why the act was usual or incidental to the agent's position."

    case "agency_estoppel":
      return "For estoppel, focus on fairness and reliance. Show what the principal caused the third party to believe and what detriment the third party suffered by relying on that appearance."

    case "ratification":
      return "When facts show the principal later accepted benefits, paid, performed, or stayed silent after learning the facts, check ratification. Knowledge of material facts is the key point."

    case "agent_liability_disclosed":
    case "agent_liability_undisclosed_partial":
      return "For agent contract liability, first classify the principal as disclosed, partially disclosed, or undisclosed. Then analyze authority and whether the agent clearly signed in representative capacity."

    case "principal_contract_liability":
      return "When a principal may be bound on a contract, organize the answer by theory: actual authority, apparent authority, inherent authority where recognized, estoppel, or ratification."

    case "implied_warranty_authority":
      return "If the principal is not bound because the agent lacked authority, check whether the agent is personally liable for falsely implying authority."

    case "respondeat_superior":
    case "scope_of_employment":
    case "frolic_detour":
    case "intentional_torts_scope":
      return "For respondeat superior, write the analysis in two steps: employee status first, scope of employment second. If the conduct looks personal, discuss frolic versus detour."

    case "independent_contractor_rule":
    case "independent_contractor_exceptions":
      return "For independent-contractor issues, start with the general no-liability rule, then test recognized exceptions such as retained control, negligent selection, inherently dangerous activity, or nondelegable duty."

    case "principal_direct_liability":
      return "Separate direct liability from vicarious liability. Direct liability focuses on the principal's own negligence in hiring, supervision, retention, authorization, or ratification."

    case "agent_duty_loyalty":
    case "agent_duty_care":
    case "agent_duty_obedience":
    case "principal_duties_to_agent":
      return "For agency fiduciary-duty issues, identify the specific duty first. Loyalty focuses on conflicts and secret benefits; care focuses on competence; obedience focuses on lawful instructions."

    case "gp_formation":
    case "gp_profit_sharing":
    case "gp_no_formality":
      return "For partnership formation, use objective facts. The strongest facts are co-ownership, profit sharing, control, and business conduct. Intent to form a partnership is not required."

    case "partner_authority":
    case "partner_authority_outside":
      return "For partner authority, compare the act to the partnership's actual business. Ordinary-course acts may bind the partnership; extraordinary acts usually require authorization."

    case "partner_joint_several_liability":
    case "partner_tort_liability":
      return "Separate partnership liability from partner personal liability. A partnership may be liable, and general partners may also face personal liability for partnership obligations."

    case "partner_duty_loyalty":
    case "partner_duty_care":
      return "For partner fiduciary duties, do not automatically use corporate standards. Partnership duty of care often uses a heightened threshold, while loyalty focuses on secret profits, competition, and adverse dealing."

    case "partner_management_rights":
    case "partner_profit_loss_sharing":
    case "partner_indemnification":
    case "transfer_partnership_interest":
    case "partnership_property":
      return "For internal partnership rights, start with the partnership agreement. If there is no agreement, apply statutory defaults carefully and separate economic rights from management rights."

    case "partnership_dissociation":
    case "wrongful_dissociation":
    case "partnership_dissolution":
    case "events_causing_dissolution":
    case "partnership_liability_after_dissolution":
      return "For dissociation and dissolution, define the event first. Modern statutes separate dissociation, dissolution, winding up, and termination."

    case "llp":
      return "For LLP questions, check filing first. Then separate shielded partnership obligations from a partner's own wrongful acts or personal guarantees."

    case "lp_formation":
    case "lp_general_partner_liability":
    case "lp_limited_partner_liability":
    case "lp_control_limitation":
    case "lp_economic_rights":
    case "lp_disclosure_requirements":
      return "For limited partnership questions, classify the actor first. General partners, limited partners, and the LP itself have different management, liability, and economic-rights rules."

    case "corp_formation":
    case "articles_of_incorporation":
    case "bylaws":
    case "de_facto_corporation":
    case "corporation_by_estoppel":
      return "For corporate formation issues, start with filing and entity existence. If formation is defective or timing is unclear, separately analyze de facto corporation, corporation by estoppel, or promoter rules."

    case "promoter_contracts":
    case "corporate_adoption_preincorporation":
    case "promoter_fiduciary_duties":
    case "share_subscriptions":
      return "For preincorporation issues, separate promoter liability from corporate adoption. Adoption may bind the corporation, but it does not automatically release the promoter."

    case "piercing_veil":
    case "piercing_factors":
    case "reverse_piercing":
    case "parent_subsidiary":
      return "For veil-piercing essays, do not list factors mechanically. Explain how the facts show misuse of the entity and why respecting limited liability would be unfair."

    case "board_management":
    case "board_meetings_notice_quorum":
    case "board_action_written_consent":
    case "board_committee":
    case "director_objection":
    case "officer_authority":
    case "officer_liability_contract":
      return "For corporate governance issues, identify the required corporate actor. Directors, officers, and shareholders have different powers, procedures, and voting rules."

    case "shareholder_meetings":
    case "shareholder_quorum_voting":
    case "proxy_voting":
    case "voting_trusts":
    case "shareholder_voting_agreements":
    case "cumulative_voting":
    case "class_voting":
      return "For shareholder voting questions, separate notice, quorum, voting threshold, proxy authority, class voting, and special voting arrangements. These are different procedural requirements."

    case "close_corporation_agreements":
    case "minority_oppression":
    case "controlling_shareholder_duties":
      return "For close corporation questions, do not analyze the dispute like a public-company problem. Look for reasonable expectations, freeze-out tactics, oppression, and equitable remedies."

    case "director_duty_of_care":
    case "business_judgment_rule":
      return "For duty of care and business judgment rule questions, emphasize process: informed decision-making, good faith, independence, and absence of conflict. A bad result alone is not enough."

    case "director_duty_of_loyalty":
    case "conflict_transaction":
    case "corporate_opportunity":
    case "officer_fiduciary_duties":
      return "For duty of loyalty questions, look for conflict, self-dealing, personal benefit, or usurped opportunity. Then analyze disclosure, disinterested approval, fairness, or rejection by the corporation."

    case "distributions_general":
    case "director_liability_unlawful_distribution":
      return "For distributions, apply the solvency limits after giving effect to the distribution. If the distribution is unlawful, analyze director liability next."

    case "authorized_shares":
    case "preemptive_rights":
    case "treasury_shares":
      return "For share-issuance and financing issues, check the articles, board approval, statutory limits, and whether shareholder rights such as preemptive rights are actually provided."

    case "inspection_rights":
      return "For inspection rights, identify the type of record requested. Basic records and sensitive records often have different standards, and proper purpose may be required."

    case "direct_action":
    case "derivative_action":
    case "derivative_action_requirements":
    case "demand_requirement":
    case "special_litigation_committee":
    case "shareholder_class_actions":
      return "For shareholder litigation, classify the claim first. Direct claims protect individual shareholder rights; derivative claims belong to the corporation and require procedural analysis."

    case "llc_formation":
    case "operating_agreement":
    case "llc_member_managed":
    case "llc_manager_managed":
    case "llc_member_liability":
    case "llc_manager_authority":
    case "llc_fiduciary_duties":
    case "llc_transferability":
    case "llc_dissociation_dissolution":
      return "For LLC questions, start with the operating agreement and management structure. Then apply statutory defaults only where the agreement is silent or limited by nonwaivable law."

    case "merger_general":
    case "sale_substantially_all_assets":
    case "amend_articles":
    case "corporate_dissolution":
    case "judicial_dissolution":
      return "For structural-change questions, organize the answer by required approval, filing, legal effect, and remedies such as appraisal, buyout, dissolution, or winding up."

    default:
      if (topic || subtopic) {
        return `For ${topic || "Business Associations"}${subtopic ? `, ${subtopic}` : ""}, state the rule briefly, connect each element to specific facts, and give a direct conclusion.`
      }

      return `For ${title}, state the rule briefly, connect each element to specific facts, and give a direct conclusion.`
  }
}


function enrichRule(rule: RuleRecord): RuleRecord {
  const commonTraps = buildCommonTraps(rule)

  return {
    ...rule,
    how_to_apply: buildHowToApply(rule),
    common_traps: commonTraps,
    exam_tip: buildExamTip(rule),
    common_trap: commonTraps
      .map((item) => `${item.title}: ${item.explanation}`)
      .join(" "),
  }
}

function main() {
  const inputPath = path.resolve(process.cwd(), "data", "Business Associations.json")
  const outputPath = path.resolve(process.cwd(), "data", "Business Associations.enriched.json")

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`)
  }

  const raw = fs.readFileSync(inputPath, "utf8")
  const parsed = JSON.parse(raw) as SubjectFile

  if (!parsed || !Array.isArray(parsed.rules)) {
    throw new Error("Invalid Business Associations JSON structure: expected { rules: [] }")
  }

  const enriched: SubjectFile = {
    ...parsed,
    rule_count: parsed.rules.length,
    rules: parsed.rules.map(enrichRule),
  }

  fs.writeFileSync(outputPath, JSON.stringify(enriched, null, 2), "utf8")

  console.log(`Enriched ${enriched.rules.length} rules.`)
  console.log(`Output written to: ${outputPath}`)
}

main()