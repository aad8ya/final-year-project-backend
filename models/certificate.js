class Certificate {
    constructor(id, template_id, issue_date, last_updated, valid_till, issuer, recipient_name, recipient_email, field_values) {
        this.id = id
        this.template_id = template_id
        this.issue_date = issue_date
        this.last_updated = last_updated
        this.valid_till = valid_till
        this.issuer = issuer
        this.recipient_name = recipient_name
        this.recipient_email = recipient_email
        this.field_values = field_values
    }
}
