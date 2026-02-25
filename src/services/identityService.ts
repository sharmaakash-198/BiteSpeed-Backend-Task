import { Request, Response } from "express";
import { pool } from "../db";
import { QueryResult } from "pg";



//logic

//1.if there is not any existing contacts ---> create new contact
//2 If match exist ---> find the oldest primary contact 
//3 convert other primaries to secondary
//4 insert new secondary if new info is provided
//5 return the final contact response

export const identifyContact = async (req: Request, res: Response) => {    //defining the request and response types for the identifyContact function

    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
        return res.status(400).json({ error: "Email or phoneNumber required" });
    }

    const client = await pool.connect();                 //postgres db connection

    try {
        await client.query("BEGIN");

        //1: Find matching contacts with the given email or phone number

        const matchQuery = `
      SELECT * FROM Contact
      WHERE email = $1 OR phoneNumber = $2
    `;

        const matchResult: QueryResult = await client.query(matchQuery, [
            email || null,
            phoneNumber || null,
        ]);

        const matches = matchResult.rows;

        //case 1: no matches found ---> create new primary contact

        if (matches.length === 0) {
            const insertQuery = `
        INSERT INTO Contact (email, phoneNumber, linkPrecedence)
        VALUES ($1, $2, 'primary')
        RETURNING *
      `;

            const insertResult: QueryResult = await client.query(insertQuery, [
                email || null,
                phoneNumber || null,
            ]);

            //commit the transaction
            await client.query("COMMIT");

            //return the new contact data
            return res.status(200).json({
                contact: {
                    primaryContactId: insertResult.rows[0].id,
                    emails: email ? [email] : [],
                    phoneNumbers: phoneNumber ? [phoneNumber] : [],
                    secondaryContactIds: [],
                },
            });
        }

        //case 2: matches exist ---> find the oldest primary contact

        // Get all primary IDs involved
        const primaryIds = matches
            .filter((c) => c.linkprecedence === "primary")
            .map((c) => c.id);

        // Get all secondary linked IDs
        const secondaryLinkedIds = matches
            .filter((c) => c.linkprecedence === "secondary")
            .map((c) => c.linkedid);

        const allPrimaryIds = [...new Set([...primaryIds, ...secondaryLinkedIds])];        //unique primary ids

        // Fetch all contacts in this group
        const groupQuery = `
      SELECT * FROM Contact
      WHERE id = ANY($1)
         OR linkedId = ANY($1)
    `;

        const groupResult: QueryResult = await client.query(groupQuery, [
            allPrimaryIds,
        ]);

        const groupContacts = groupResult.rows;

        // Find oldest primary
        const primaryContacts = groupContacts.filter(
            (c) => c.linkprecedence === "primary"
        );

        primaryContacts.sort(
            (a, b) =>
                new Date(a.createdat).getTime() -
                new Date(b.createdat).getTime()
        );

        const oldestPrimary = primaryContacts[0];

        // Convert other primaries → secondary
        for (const contact of primaryContacts) {
            if (contact.id !== oldestPrimary.id) {
                await client.query(
                    `
          UPDATE Contact
          SET linkPrecedence = 'secondary',
              linkedId = $1,
              updatedAt = CURRENT_TIMESTAMP
          WHERE id = $2
          `,
                    [oldestPrimary.id, contact.id]
                );
            }
        }

        // Insert new secondary if new info
        const emailExists = email
            ? groupContacts.some((c) => c.email === email)
            : true;

        const phoneExists = phoneNumber
            ? groupContacts.some((c) => c.phonenumber === phoneNumber)
            : true;

        const shouldCreateNew = !(emailExists && phoneExists);

        if (shouldCreateNew) {
            await client.query(
                `
        INSERT INTO Contact (email, phoneNumber, linkPrecedence, linkedId)
        VALUES ($1, $2, 'secondary', $3)
        `,
                [email || null, phoneNumber || null, oldestPrimary.id]
            );
        }

        // Fetch final updated group
        const finalGroupResult: QueryResult = await client.query(groupQuery, [
            [oldestPrimary.id],
        ]);

        const finalContacts = finalGroupResult.rows;

        // Ensure primary email & phone appear first
        const primaryContact = finalContacts.find(
            (c) => c.id === oldestPrimary.id
        );

        const otherContacts = finalContacts.filter(
            (c) => c.id !== oldestPrimary.id
        );

        const emails = [
            primaryContact?.email,
            ...otherContacts.map((c) => c.email),
        ]
            .filter(Boolean)
            .filter((value, index, self) => self.indexOf(value) === index);

        const phoneNumbers = [
            primaryContact?.phonenumber,
            ...otherContacts.map((c) => c.phonenumber),
        ]
            .filter(Boolean)
            .filter((value, index, self) => self.indexOf(value) === index);

        const secondaryContactIds = finalContacts
            .filter((c) => c.linkprecedence === "secondary")
            .map((c) => c.id);

        await client.query("COMMIT");

        return res.status(200).json({
            contact: {
                primaryContactId: oldestPrimary.id,
                emails,
                phoneNumbers,
                secondaryContactIds,
            },
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    } finally {
        client.release();
    }
};